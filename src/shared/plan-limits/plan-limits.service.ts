import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaylistCollaborator } from 'src/playlist-collaborators/entities/playlist-collaborator.entity';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { RequestsStatus } from 'src/requested-tracks/entities/requests-status.enum';
import { Track } from 'src/tracks/entities/track.entity';
import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserRole } from 'src/users/entities/user-role.enum';
import { getLimit, PLAN_LIMITS } from './plan-limits.config';
import { PlanResource } from './plan-limit.decorator';

export interface ResourceUsage {
  current: number;
  /** null = ilimitado */
  limit: number | null;
}

@Injectable()
export class PlanLimitsService {
  constructor(
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
    @InjectRepository(RequestedTrack)
    private readonly requestRepo: Repository<RequestedTrack>,
    @InjectRepository(Playlist) private readonly playlistRepo: Repository<Playlist>,
    @InjectRepository(PlaylistCollaborator)
    private readonly collaboratorRepo: Repository<PlaylistCollaborator>,
  ) {}

  /** Cuenta el uso actual de un recurso para un usuario. Única fuente de verdad de las queries. */
  async countResource(resource: PlanResource, userId: string): Promise<number> {
    switch (resource) {
      case 'tracks':
        return this.trackRepo
          .createQueryBuilder('track')
          .innerJoin('track.authors', 'author', 'author.id = :userId', { userId })
          .getCount();

      case 'requests':
        return this.requestRepo.count({
          where: { requester: { id: userId }, status: RequestsStatus.PENDIENTE },
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

  /** Recursos aplicables a un rol (unión de las claves definidas en ambos planes para ese rol). */
  resourcesForRole(role: UserRole): PlanResource[] {
    const free = PLAN_LIMITS[role]?.[UserPlan.FREE] ?? {};
    const pro = PLAN_LIMITS[role]?.[UserPlan.PRO] ?? {};
    return Array.from(new Set([...Object.keys(free), ...Object.keys(pro)])) as PlanResource[];
  }

  /** Uso de todos los recursos aplicables al rol/plan de un usuario. */
  async getUsageForRole(
    role: UserRole,
    plan: UserPlan,
    userId: string,
  ): Promise<Partial<Record<PlanResource, ResourceUsage>>> {
    const resources = this.resourcesForRole(role);

    const entries = await Promise.all(
      resources.map(async (resource) => {
        const limit = getLimit(role, plan, resource) ?? null;
        const current = await this.countResource(resource, userId);
        return [resource, { current, limit }] as const;
      }),
    );

    return Object.fromEntries(entries);
  }
}
