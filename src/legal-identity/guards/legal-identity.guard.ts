import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { LegalIdentityService } from '../legal-identity.service';

export const LEGAL_IDENTITY_REQUIRED_CODE = 'LEGAL_IDENTITY_REQUIRED';

/**
 * Exige que el usuario autenticado tenga la identidad legal verificada
 * (Ley 527). Re-consulta la DB en cada request — nunca confía en el JWT,
 * igual que `EmailVerifiedGuard`. Responde 403 con `code: LEGAL_IDENTITY_REQUIRED`
 * para que el frontend abra el modal bloqueante en vez de un error genérico.
 */
@Injectable()
export class LegalIdentityGuard implements CanActivate {
  constructor(private readonly legalIdentityService: LegalIdentityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user }: { user?: JwtPayload } = context.switchToHttp().getRequest();
    if (!user) {
      throw new HttpException('Usuario no autenticado', HttpStatus.FORBIDDEN);
    }

    const verified = await this.legalIdentityService.isVerified(user.id);
    if (!verified) {
      throw new HttpException(
        {
          error: LEGAL_IDENTITY_REQUIRED_CODE,
          code: LEGAL_IDENTITY_REQUIRED_CODE,
          message: 'Debes completar y verificar tu identidad legal para continuar',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
