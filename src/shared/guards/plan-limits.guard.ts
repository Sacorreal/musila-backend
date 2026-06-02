import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { PlaylistCollaborator } from 'src/playlist-collaborators/entities/playlist-collaborator.entity';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { RequestsStatus } from 'src/requested-tracks/entities/requests-status.enum';
import { Track } from 'src/tracks/entities/track.entity';
import { UserPlan } from 'src/users/entities/user-plan.enum';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import {
  PLAN_LIMIT_KEY,
  PlanResource,
} from '../plan-limits/plan-limit.decorator';
import { getLimit } from '../plan-limits/plan-limits.config';

@Injectable()
export class PlanLimitsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
    @InjectRepository(RequestedTrack)
    private readonly requestRepo: Repository<RequestedTrack>,
    @InjectRepository(Playlist)
    private readonly playlistRepo: Repository<Playlist>,
    @InjectRepository(PlaylistCollaborator)
    private readonly collaboratorRepo: Repository<PlaylistCollaborator>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.getAllAndOverride<PlanResource>(PLAN_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!resource) return true;

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const jwtUser = request.user;
    if (!jwtUser) return true;

    const user = await this.userRepo.findOne({ where: { id: jwtUser.id } });
    if (!user) return true;

    const plan = user.plan ?? UserPlan.FREE;
    const limit = getLimit(user.role, plan, resource);

    if (limit === undefined || limit === null) return true;

    const count = await this.countResource(resource, jwtUser.id);

    if (count >= limit) {
      throw new HttpException(
        {
          error: 'PLAN_LIMIT_REACHED',
          resource,
          limit,
          current: count,
          upgradeRequired: 'pro',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }

  private async countResource(resource: PlanResource, userId: string): Promise<number> {
    switch (resource) {
      case 'tracks':
        return this.trackRepo
          .createQueryBuilder('track')
          .innerJoin('track.authors', 'author', 'author.id = :userId', { userId })
          .getCount();

      case 'requests':
        return this.requestRepo.count({
          where: {
            requester: { id: userId },
            status: RequestsStatus.PENDIENTE,
          },
        });

      case 'playlists':
        return this.playlistRepo.count({ where: { owner: { id: userId } } });

      case 'collaborators': {
        const playlists = await this.playlistRepo.find({
          where: { owner: { id: userId } },
          select: ['id'],
        });
        if (!playlists.length) return 0;
        const playlistIds = playlists.map((p) => p.id);
        return this.collaboratorRepo
          .createQueryBuilder('c')
          .where('c.playlist_id IN (:...ids)', { ids: playlistIds })
          .getCount();
      }

      default:
        return 0;
    }
  }
}
