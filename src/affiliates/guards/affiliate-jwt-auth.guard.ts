import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AFFILIATE_JWT_SERVICE } from '../providers/affiliate-jwt.provider';
import { AffiliateJwtPayload } from '../interfaces/affiliate-jwt-payload.interface';

@Injectable()
export class AffiliateJwtAuthGuard implements CanActivate {
  constructor(
    @Inject(AFFILIATE_JWT_SERVICE) private readonly affiliateJwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Acceso denegado: No se encontró un token de afiliado');
    }

    try {
      const payload = await this.affiliateJwtService.verifyAsync<AffiliateJwtPayload>(token);

      if (payload.type !== 'affiliate') {
        throw new UnauthorizedException('Token inválido para este recurso');
      }

      request['affiliate'] = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado. Por favor, inicia sesión nuevamente');
    }
  }

  private extractToken(request: Request): string | undefined {
    const tokenFromCookie = request.cookies?.['affiliate_access_token'];
    if (tokenFromCookie) {
      return tokenFromCookie;
    }

    const [type, tokenFromHeader] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? tokenFromHeader : undefined;
  }
}
