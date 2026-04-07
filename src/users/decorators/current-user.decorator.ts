import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  AuthenticatedRequest,
  JwtPayload,
} from '../../auth/interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new InternalServerErrorException(
        'El usuario no fue encontrado en la request. ¿Olvidaste usar el JWTAuthGuard?',
      );
    }
    return user;
  },
);