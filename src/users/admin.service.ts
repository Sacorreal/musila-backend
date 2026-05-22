import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { RequestsStatus } from 'src/requested-tracks/entities/requests-status.enum';
import { AdminStatsDto } from './dto/admin-stats.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Track) private readonly tracksRepo: Repository<Track>,
    @InjectRepository(MusicalGenre) private readonly genreRepo: Repository<MusicalGenre>,
    @InjectRepository(RequestedTrack) private readonly requestsRepo: Repository<RequestedTrack>,
  ) {}

  async getStats(): Promise<AdminStatsDto> {
    const [totalUsers, totalTracks, totalGenres, totalRequests, pendingRequests, approvedRequests, rejectedRequests] =
      await Promise.all([
        this.usersRepo.count(),
        this.tracksRepo.count(),
        this.genreRepo.count(),
        this.requestsRepo.count(),
        this.requestsRepo.count({ where: { status: RequestsStatus.PENDIENTE } }),
        this.requestsRepo.count({ where: { status: RequestsStatus.APROBADA } }),
        this.requestsRepo.count({ where: { status: RequestsStatus.RECHAZADA } }),
      ]);

    return { totalUsers, totalTracks, totalGenres, totalRequests, pendingRequests, approvedRequests, rejectedRequests };
  }
}
