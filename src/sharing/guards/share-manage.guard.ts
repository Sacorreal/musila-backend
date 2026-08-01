import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import { ShareLink } from '../entities/share-link.entity';

interface ShareManageRequest {
  user: JwtPayload;
  params: { playlistId?: string; trackId?: string; shareLinkId?: string };
}

/**
 * Valida que el usuario autenticado pueda gestionar un recurso de compartir:
 * - Al crear un enlace (`playlistId`/`trackId` en la ruta): dueño de la playlist,
 *   o cualquier autor del track (un Track puede tener varios `authors`).
 * - Al gestionar un enlace ya creado (`shareLinkId` en la ruta): dueño del
 *   `ShareLink` (quien lo creó, ya validado en el paso anterior).
 */
@Injectable()
export class ShareManageGuard implements CanActivate {
  constructor(
    @InjectRepository(Playlist) private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(Track) private readonly trackRepository: Repository<Track>,
    @InjectRepository(ShareLink) private readonly shareLinkRepository: Repository<ShareLink>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ShareManageRequest>();
    const { user, params } = request;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    if (user.planType === UserPlanType.ADMIN) {
      return true;
    }

    if (params.playlistId) {
      const playlist = await this.playlistRepository.findOne({
        where: { id: params.playlistId },
        relations: ['owner'],
      });
      if (!playlist) throw new NotFoundException('Playlist no encontrada');
      if (playlist.owner.id !== user.id) {
        throw new ForbiddenException('No eres dueño de esta playlist');
      }
      return true;
    }

    if (params.trackId) {
      const track = await this.trackRepository.findOne({
        where: { id: params.trackId },
        relations: ['authors'],
      });
      if (!track) throw new NotFoundException('Track no encontrado');
      if (!track.authors.some((author) => author.id === user.id)) {
        throw new ForbiddenException('No eres autor de este track');
      }
      return true;
    }

    if (params.shareLinkId) {
      const shareLink = await this.shareLinkRepository.findOne({
        where: { id: params.shareLinkId },
        relations: ['owner'],
      });
      if (!shareLink) throw new NotFoundException('Enlace de compartir no encontrado');
      if (shareLink.owner.id !== user.id) {
        throw new ForbiddenException('No eres dueño de este enlace de compartir');
      }
      return true;
    }

    throw new NotFoundException('Recurso no especificado en la ruta');
  }
}
