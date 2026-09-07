import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { RequestsStatus } from 'src/requested-tracks/entities/requests-status.enum';
import { AdminStatsDto } from './dto/admin-stats.dto';
import { StorageService } from 'src/shared/storage/storage.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Track) private readonly tracksRepo: Repository<Track>,
    @InjectRepository(MusicalGenre) private readonly genreRepo: Repository<MusicalGenre>,
    @InjectRepository(RequestedTrack) private readonly requestsRepo: Repository<RequestedTrack>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storageService: StorageService,
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

  /**
   * Elimina un usuario de forma física e irreversible junto con toda su data
   * relacionada (chats, mensajes, playlists, requests, notificaciones, etc.).
   * Los pagos conservan el registro histórico con el vínculo al usuario en NULL.
   * Los tracks de los que el usuario era el único autor se eliminan también,
   * ya que un track no puede quedar sin autores.
   */
  async hardDeleteUserService(id: string): Promise<{ id: string; message: string }> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('El usuario no existe');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const filesToDelete: string[] = [];
    if (user.avatarKey) filesToDelete.push(user.avatarKey);

    try {
      const soleAuthoredTracks: { id: string; audioKey: string | null; coverKey: string | null }[] =
        await queryRunner.manager.query(
          `SELECT t.id, t.audio_key AS "audioKey", t.cover_key AS "coverKey"
           FROM track t
           WHERE EXISTS (
             SELECT 1 FROM track_authors_users tau WHERE tau."trackId" = t.id AND tau."usersId" = $1
           )
           AND NOT EXISTS (
             SELECT 1 FROM track_authors_users tau2 WHERE tau2."trackId" = t.id AND tau2."usersId" != $1
           )`,
          [id],
        );

      if (soleAuthoredTracks.length > 0) {
        const soleAuthoredTrackIds = soleAuthoredTracks.map((track) => track.id);

        const documentKeys: { documentKey: string | null }[] = await queryRunner.manager.query(
          `SELECT "document_key" AS "documentKey" FROM intellectual_property WHERE "trackId" = ANY($1)`,
          [soleAuthoredTrackIds],
        );

        filesToDelete.push(
          ...documentKeys.map((doc) => doc.documentKey).filter((key): key is string => !!key),
          ...soleAuthoredTracks.flatMap((track) => [track.audioKey, track.coverKey]).filter((key): key is string => !!key),
        );

        await queryRunner.manager.delete(Track, soleAuthoredTrackIds);
      }

      await queryRunner.manager.delete(User, id);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    await Promise.all(filesToDelete.map((key) => this.storageService.deleteObject(key)));

    return { id, message: 'Usuario y toda su data relacionada fueron eliminados permanentemente' };
  }
}
