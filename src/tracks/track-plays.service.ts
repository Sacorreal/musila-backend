import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { TrackPlay } from './entities/track-play.entity';

/** Ventana de dedupe: reproducciones del mismo usuario+track dentro de este
 * lapso cuentan una sola vez, para no inflar el conteo con re-escuchas o
 * re-montajes del reproductor. */
const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

export interface TrackPlayStats {
  totalPlays: number;
  uniqueListeners: number;
}

/** Filtro de rango temporal: `created_at >= from AND created_at < to`. */
export interface DateRange {
  from: Date;
  to: Date;
}

export interface ListenerPlayStats {
  totalPlays: number;
  distinctTracksPlayed: number;
}

export interface ListenerRankedTrack {
  trackId: string;
  title: string;
  plays: number;
}

export interface MostActiveListener {
  userId: string;
  plays: number;
}

@Injectable()
export class TrackPlaysService {
  constructor(
    @InjectRepository(TrackPlay)
    private readonly trackPlayRepo: Repository<TrackPlay>,
  ) {}

  /**
   * Registra una reproducción efectiva. Aplica un dedupe suave por
   * `(track, user)` dentro de {@link DEDUPE_WINDOW_MS}; las reproducciones
   * anónimas (`userId` nulo) no se deduplican.
   */
  async register(trackId: string, userId: string | null): Promise<void> {
    if (userId) {
      const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
      const recent = await this.trackPlayRepo
        .createQueryBuilder('play')
        .where('play.track_id = :trackId', { trackId })
        .andWhere('play.user_id = :userId', { userId })
        .andWhere('play.created_at >= :since', { since })
        .getExists();
      if (recent) return;
    }

    const play = this.trackPlayRepo.create({
      track: { id: trackId },
      user: userId ? { id: userId } : null,
    });
    await this.trackPlayRepo.save(play);
  }

  /** Reproducciones totales y usuarios únicos agregados para un conjunto de tracks. */
  async getStatsForTracks(trackIds: string[]): Promise<TrackPlayStats> {
    if (trackIds.length === 0) return { totalPlays: 0, uniqueListeners: 0 };

    const raw = await this.trackPlayRepo
      .createQueryBuilder('play')
      .select('COUNT(*)', 'totalPlays')
      .addSelect('COUNT(DISTINCT play.user_id)', 'uniqueListeners')
      .where('play.track_id IN (:...trackIds)', { trackIds })
      .getRawOne<{ totalPlays: string; uniqueListeners: string }>();

    return {
      totalPlays: Number(raw?.totalPlays ?? 0),
      uniqueListeners: Number(raw?.uniqueListeners ?? 0),
    };
  }

  /** Estadísticas de una sola canción. */
  getStatsForTrack(trackId: string): Promise<TrackPlayStats> {
    return this.getStatsForTracks([trackId]);
  }

  /** Reproducciones totales y canciones distintas escuchadas por un conjunto de oyentes. */
  async getStatsForListeners(userIds: string[], range?: DateRange): Promise<ListenerPlayStats> {
    if (userIds.length === 0) return { totalPlays: 0, distinctTracksPlayed: 0 };

    const qb = this.trackPlayRepo
      .createQueryBuilder('play')
      .select('COUNT(*)', 'totalPlays')
      .addSelect('COUNT(DISTINCT play.track_id)', 'distinctTracksPlayed')
      .where('play.user_id IN (:...userIds)', { userIds });
    this.applyDateRange(qb, range);

    const raw = await qb.getRawOne<{ totalPlays: string; distinctTracksPlayed: string }>();

    return {
      totalPlays: Number(raw?.totalPlays ?? 0),
      distinctTracksPlayed: Number(raw?.distinctTracksPlayed ?? 0),
    };
  }

  /** Canciones más escuchadas por un conjunto de oyentes, ordenadas por reproducciones descendente. */
  async getTopTracksForListeners(
    userIds: string[],
    range?: DateRange,
    limit = 5,
  ): Promise<ListenerRankedTrack[]> {
    if (userIds.length === 0) return [];

    const qb = this.trackPlayRepo
      .createQueryBuilder('play')
      .innerJoin('play.track', 'track')
      .select('track.id', 'trackId')
      .addSelect('track.title', 'title')
      .addSelect('COUNT(*)', 'plays')
      .where('play.user_id IN (:...userIds)', { userIds });
    this.applyDateRange(qb, range);

    const rows = await qb
      .groupBy('track.id')
      .addGroupBy('track.title')
      .orderBy('plays', 'DESC')
      .limit(limit)
      .getRawMany<{ trackId: string; title: string; plays: string }>();

    return rows.map((r) => ({ trackId: r.trackId, title: r.title, plays: Number(r.plays) }));
  }

  /** Oyente con más reproducciones dentro de un conjunto de usuarios, o `null` si no hay reproducciones. */
  async getMostActiveListener(userIds: string[], range?: DateRange): Promise<MostActiveListener | null> {
    if (userIds.length === 0) return null;

    const qb = this.trackPlayRepo
      .createQueryBuilder('play')
      .select('play.user_id', 'userId')
      .addSelect('COUNT(*)', 'plays')
      .where('play.user_id IN (:...userIds)', { userIds });
    this.applyDateRange(qb, range);

    const raw = await qb.groupBy('play.user_id').orderBy('plays', 'DESC').limit(1).getRawOne<{
      userId: string;
      plays: string;
    }>();

    return raw ? { userId: raw.userId, plays: Number(raw.plays) } : null;
  }

  private applyDateRange<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, range?: DateRange): void {
    if (!range) return;
    qb.andWhere('play.created_at >= :from AND play.created_at < :to', {
      from: range.from,
      to: range.to,
    });
  }
}
