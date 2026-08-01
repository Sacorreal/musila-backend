import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UsersService } from '../users.service';
import { ALLOWED_ROLES_KEY } from '../decorators/allowed-roles.decorator';
import { MusicRole } from '../entities/music-role.enum';

/**
 * Exige que el usuario autenticado tenga uno de los `MusicRole` permitidos.
 * Consulta la BD en cada request (no confía en el JWT, que hoy no incluye
 * `role` en su payload — ver `JwtPayload`), siguiendo el mismo patrón que
 * `EmailVerifiedGuard`.
 */
@Injectable()
export class MusicRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<MusicRole[]>(ALLOWED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user }: { user?: JwtPayload } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const currentUser = await this.usersService.findOneUserByIdService(user.id);

    if (!requiredRoles.includes(currentUser.role)) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
