import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { AUDIT_ACTION_KEY } from '../decorators/audit-action.decorator';

const REDACTED_KEYS = new Set(['password', 'token', 'secret', 'authorization']);

interface AuditableRequest extends Request {
  user?: JwtPayload;
}

/**
 * Primer interceptor del proyecto. Captura metadata de la acción marcada
 * con `@AuditAction(...)` y la publica vía `EventBusService` (fire-and-forget,
 * no bloquea la respuesta HTTP con un INSERT síncrono) — la persistencia
 * real ocurre en `StaffAuditPersistenceListener`. Si algo falla capturando
 * o emitiendo, se loguea y jamás se interrumpe la acción de negocio.
 */
@Injectable()
export class StaffAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(StaffAuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly eventBus: EventBusService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditCode = this.reflector.getAllAndOverride<string>(AUDIT_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!auditCode) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuditableRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();
    const [module, ...actionParts] = auditCode.split(':');
    const action = actionParts.join(':') || auditCode;

    const capture = (outcome: 'success' | 'failure', statusCode?: number) => {
      const user = request.user;
      if (!user) return;

      try {
        this.eventBus.emit('staff.audit.captured', {
          actorUserId: user.id,
          actorName: user.name ?? user.email,
          module,
          action,
          httpMethod: request.method,
          route: (request.route as { path?: string } | undefined)?.path ?? request.originalUrl,
          statusCode,
          outcome,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          metadata: this.summarizeRequest(request),
          durationMs: Date.now() - startTime,
        });
      } catch (error) {
        this.logger.error(`No se pudo emitir el evento de auditoría (${auditCode})`, error as Error);
      }
    };

    return next.handle().pipe(
      tap(() => capture('success', response.statusCode)),
      catchError((error: unknown) => {
        const statusCode = error instanceof Object && 'status' in error ? (error as { status: number }).status : 500;
        capture('failure', statusCode);
        throw error;
      }),
    );
  }

  private summarizeRequest(request: AuditableRequest): Record<string, unknown> {
    return {
      params: this.redact(request.params),
      query: this.redact(request.query as Record<string, unknown>),
      body: this.redact(request.body as Record<string, unknown>),
    };
  }

  private redact(source?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!source || typeof source !== 'object') return source;

    return Object.entries(source).reduce<Record<string, unknown>>((acc, [key, value]) => {
      acc[key] = REDACTED_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : value;
      return acc;
    }, {});
  }
}
