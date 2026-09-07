import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { resolveOrganizationId } from 'src/authorization/utils/organization-context.util';
import { Observable, catchError, throwError } from 'rxjs';
import {
  CONSUME_ENTITLEMENT_KEY,
  ConsumeEntitlementMetadata,
} from '../decorators/consume-entitlement.decorator';
import { EntitlementScope } from '../entities/entitlement-scope.enum';
import { EntitlementService } from '../entitlement.service';
import { UsageService, UsageSubject } from '../usage.service';

interface EntitlementRequest extends Request {
  user?: JwtPayload;
}

/**
 * Consume la cuota ANTES de invocar el handler (upsert atómico: sin ventana
 * de carrera entre chequeo y creación del recurso) y la reembolsa si el
 * handler lanza. Si el plan del sujeto no define el entitlement, no hay
 * cuota que aplicar: la capability ya decidió el acceso.
 *
 * El 402 conserva el shape legacy `PLAN_LIMIT_REACHED` para no romper el
 * interceptor axios del frontend, y añade `code: ENTITLEMENT_EXCEEDED`.
 */
@Injectable()
export class EntitlementConsumeInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlementService: EntitlementService,
    private readonly usageService: UsageService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const metadata = this.reflector.getAllAndOverride<ConsumeEntitlementMetadata | undefined>(
      CONSUME_ENTITLEMENT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) return next.handle();

    const request = context.switchToHttp().getRequest<EntitlementRequest>();
    const user = request.user;
    if (!user) return next.handle();

    const subject = await this.resolveSubject(metadata.entitlementKey, user.id, request);
    const resolved = await this.entitlementService.resolvePlanEntitlement(
      subject,
      metadata.entitlementKey,
    );

    if (!resolved) return next.handle();

    const { planEntitlement, subscription } = resolved;
    const periodKey = this.usageService.buildPeriodKey(planEntitlement.period, new Date(), {
      subscriptionId: subscription.id,
      periodStart: subscription.startAt,
    });

    const result = await this.usageService.consume({
      subject,
      entitlementKey: metadata.entitlementKey,
      periodKey,
      amount: metadata.amount,
      limit: planEntitlement.limit,
      unlimited: planEntitlement.unlimited,
    });

    if (!result.allowed) {
      throw new HttpException(
        {
          error: 'PLAN_LIMIT_REACHED',
          code: 'ENTITLEMENT_EXCEEDED',
          resource: metadata.entitlementKey,
          limit: planEntitlement.limit,
          current: result.consumed,
          remaining: result.remaining,
          upgradeRequired: 'pro',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return next.handle().pipe(
      catchError((error: unknown) => {
        void this.usageService.refund(
          subject,
          metadata.entitlementKey,
          periodKey,
          metadata.amount,
        );
        return throwError(() => error);
      }),
    );
  }

  /** Sujeto del consumo según el scope del entitlement: USER → usuario; ORGANIZATION/TRACKSPACE → organización del contexto. */
  private async resolveSubject(
    entitlementKey: string,
    userId: string,
    request: EntitlementRequest,
  ): Promise<UsageSubject> {
    const definition = await this.entitlementService.findEntitlementByKey(entitlementKey);
    const organizationId = resolveOrganizationId(request);

    if (
      organizationId &&
      definition &&
      (definition.scope === EntitlementScope.ORGANIZATION ||
        definition.scope === EntitlementScope.TRACKSPACE)
    ) {
      return this.entitlementService.organizationSubject(organizationId);
    }

    return this.entitlementService.userSubject(userId);
  }
}
