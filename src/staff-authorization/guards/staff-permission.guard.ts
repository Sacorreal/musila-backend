import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import { STAFF_PERMISSION_KEY } from '../decorators/require-staff-permission.decorator';
import { StaffAuthorizationService } from '../staff-authorization.service';

interface StaffPermissionRequest {
  user: JwtPayload;
}

/**
 * Mismo patrón que `PlaylistPermissionGuard`: si la ruta no lleva
 * `@RequireStaffPermission(...)`, se permite el acceso por defecto — así
 * convive con `PlansGuard` en rutas que aún no migraron al nuevo sistema.
 */
@Injectable()
export class StaffPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly staffAuthorizationService: StaffAuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCodes = this.reflector.getAllAndOverride<string[]>(STAFF_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredCodes || requiredCodes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<StaffPermissionRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Super Admin de sistema tiene acceso total, igual que en el resto del panel admin.
    if (user.planType === UserPlanType.SUPERADMIN) {
      return true;
    }

    const hasPermission = await this.staffAuthorizationService.hasPermission(user.id, requiredCodes);

    if (!hasPermission) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere alguno de los siguientes permisos: ${requiredCodes.join(', ')}`,
      );
    }

    return true;
  }
}
