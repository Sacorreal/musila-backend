import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackPlay } from './entities/track-play.entity';

/** Ventana de dedupe: reproducciones del mismo usuario+track dentro de este
 * lapso cuentan una sola vez, para no inflar el conteo con re-escuchas o
 * re-montajes del reproductor. */
const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

export interface TrackPlayStats {
  totalPlays: number;
  uniqueListeners: number;
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
}
