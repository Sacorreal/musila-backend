import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import { REQUIRE_STEP_UP_KEY } from '../decorators/require-step-up.decorator';
import { StepUpAuthService } from '../services/step-up-auth.service';

/**
 * Guard de step-up (§15). Si la ruta no lleva `@RequireStepUp(scope)` permite
 * el acceso (mismo patrón de convivencia que `AuthorizationGuard`). Requiere
 * `JWTAuthGuard` antes en la cadena. Si el usuario no tiene un grant vigente
 * para el scope, responde 403 con código `STEP_UP_REQUIRED` para que el
 * frontend abra el `StepUpAuthModal`.
 */
@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly stepUpAuthService: StepUpAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const scope = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRE_STEP_UP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!scope) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    await this.stepUpAuthService.assertValidGrant(user.id, scope);
    return true;
  }
}
