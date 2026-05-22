import { Track } from '../entities/track.entity';

export interface PaginatedTracks {
    data: Track[];
    total: number;
  }