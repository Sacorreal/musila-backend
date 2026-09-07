import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { LegalIdentityService } from 'src/legal-identity/legal-identity.service';
import { LEGAL_IDENTITY_REQUIRED_CODE } from 'src/legal-identity/guards/legal-identity.guard';
import { Track } from '../entities/track.entity';

/**
 * Exige identidad legal verificada para reproducir un track cuyo autor no es
 * el usuario autenticado (reproducir el propio contenido nunca se bloquea).
 * Re-consulta la DB en cada request, igual que `LegalIdentityGuard`.
 */
@Injectable()
export class TrackLegalIdentityGuard implements CanActivate {
  constructor(
    @InjectRepository(Track)
    private readonly trackRepo: Repository<Track>,
    private readonly legalIdentityService: LegalIdentityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload; params: { id: string } }>();
    const { user, params } = request;
    if (!user) {
      throw new HttpException('Usuario no autenticado', HttpStatus.FORBIDDEN);
    }

    const track = await this.trackRepo.findOne({
      where: { id: params.id },
      relations: ['authors'],
    });
    if (!track) throw new NotFoundException('El track no existe');

    const isOwnTrack = track.authors?.some((author) => author.id === user.id);
    if (isOwnTrack) return true;

    const verified = await this.legalIdentityService.isVerified(user.id);
    if (!verified) {
      throw new HttpException(
        {
          error: LEGAL_IDENTITY_REQUIRED_CODE,
          code: LEGAL_IDENTITY_REQUIRED_CODE,
          message: 'Debes completar y verificar tu identidad legal para reproducir canciones de otros autores',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
