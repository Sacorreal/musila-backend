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
} from '../../auth/interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (context: ExecutionContext): JwtPayload => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // 1. Validar que el Guard se ejecutó
    if (!user) {
      throw new InternalServerErrorException(
        'El usuario no fue encontrado en la request. ¿Olvidaste usar el JWTAuthGuard?',
      );
    }
    return user;
  },
);