import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserRole } from 'src/users/entities/user-role.enum';
import {
  AuthenticatedRequest,
  JwtPayload,
} from '../interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (roles: UserRole[] | undefined, context: ExecutionContext): JwtPayload => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // 1. Validar que el Guard se ejecutó
    if (!user) {
      throw new InternalServerErrorException(
        'El usuario no fue encontrado en la request. ¿Olvidaste usar el JWTAuthGuard?',
      );
    }

    // 2. Validar Roles (RBAC)
    if (roles && roles.length > 0 && !roles.includes(user.role)) {
      throw new ForbiddenException(`Tu rol actual ('${user.role}') no tiene autorización para realizar esta acción`);
    }

    return user;
  },
);