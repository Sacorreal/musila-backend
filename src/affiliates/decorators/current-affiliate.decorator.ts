import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  AffiliateJwtPayload,
  AuthenticatedAffiliateRequest,
} from '../interfaces/affiliate-jwt-payload.interface';

export const CurrentAffiliate = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AffiliateJwtPayload => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedAffiliateRequest>();
    const affiliate = request.affiliate;

    if (!affiliate) {
      throw new InternalServerErrorException(
        'El afiliado no fue encontrado en la request. ¿Olvidaste usar el AffiliateJwtAuthGuard?',
      );
    }
    return affiliate;
  },
);
