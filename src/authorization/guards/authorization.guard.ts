import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { REQUIRE_CAPABILITY_KEY } from '../decorators/require-capability.decorator';
import { AuthorizationService } from '../authorization.service';
import {
  AuthorizationContext,
  CapabilityRequirement,
} from '../interfaces/authorization.types';
import { resolveOrganizationId } from '../utils/organization-context.util';

interface AuthorizedRequest extends Request {
  user?: JwtPayload;
  authorizationContext?: AuthorizationContext;
}

/**
 * Guard del motor de autorización. Si la ruta no lleva
 * `@RequireCapability(...)` permite el acceso (mismo patrón que
 * `StaffPermissionGuard`, para convivir con los guards legacy durante la
 * migración gradual). Requiere `JWTAuthGuard` antes en la cadena.
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<CapabilityRequirement | undefined>(
      REQUIRE_CAPABILITY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requirement || requirement.caps.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthorizedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const authorizationContext: AuthorizationContext = {
      userId: user.id,
      organizationId: resolveOrganizationId(request),
    };

    const decision = await this.authorizationService.check(authorizationContext, requirement);

    if (!decision.allowed) {
      throw new ForbiddenException({
        message: `Acceso denegado (${decision.code})`,
        code: decision.code,
        missingCapabilities: decision.missingCapabilities,
        ...decision.diagnostics,
      });
    }

    // Contexto validado, disponible para services e interceptores aguas abajo.
    request.authorizationContext = authorizationContext;
    return true;
  }
}
