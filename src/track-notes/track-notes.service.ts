import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { AuthorizationService } from 'src/authorization/authorization.service';
import { Guest } from 'src/guests/entities/guest.entity';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { PlaylistCollaboratorsService } from 'src/playlist-collaborators/playlist-collaborators.service';
import { SharingService } from 'src/sharing/sharing.service';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import { CreateTrackNoteDto } from './dto/create-track-note.dto';
import { TrackNoteResponseDto } from './dto/track-note-response.dto';
import { UpdateTrackNoteDto } from './dto/update-track-note.dto';
import { TrackNote } from './entities/track-note.entity';

const MARKETPLACE_SEARCH_CAPABILITY = 'marketplace.search';
const PLAYLISTS_MODERATE_CAPABILITY = 'platform.playlists.moderate';

@Injectable()
export class TrackNotesService {
  constructor(
    @InjectRepository(TrackNote)
    private readonly trackNoteRepository: Repository<TrackNote>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    private readonly playlistCollaboratorsService: PlaylistCollaboratorsService,
    private readonly sharingService: SharingService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async create(dto: CreateTrackNoteDto, user: JwtPayload): Promise<TrackNoteResponseDto> {
    await this.assertCanAccessNotes(dto.trackId, dto.playlistId, user);

    // Cuando hay playlistId, assertCanAccessNotes ya validó que el track
    // pertenece a esa playlist (por ende existe); sin playlistId hace falta
    // esta verificación explícita para no depender del error de FK.
    if (!dto.playlistId) {
      const trackExists = await this.trackRepository.exists({ where: { id: dto.trackId } });
      if (!trackExists) {
        throw new NotFoundException('Track no encontrado');
      }
    }

    const isGuestAuthor = user.planType === UserPlanType.INVITADO;

    const note = this.trackNoteRepository.create({
      track: { id: dto.trackId } as Track,
      playlist: dto.playlistId ? ({ id: dto.playlistId } as Playlist) : null,
      content: dto.content,
      timestampSeconds: dto.timestampSeconds ?? null,
      authorUser: isGuestAuthor ? null : ({ id: user.id } as User),
      authorGuest: isGuestAuthor ? ({ id: user.id } as Guest) : null,
    });
    const saved = await this.trackNoteRepository.save(note);

    // save() no recarga relaciones: solo conserva el { id } que le pasamos.
    // Se recarga para poder resolver authorName con los datos completos.
    const reloaded = await this.findNoteWithAuthorOrFail(saved.id);
    return this.toResponseDto(reloaded, dto.trackId, dto.playlistId ?? null);
  }

  async findAllByTrack(
    trackId: string,
    playlistId: string | undefined,
    user: JwtPayload,
  ): Promise<TrackNoteResponseDto[]> {
    await this.assertCanAccessNotes(trackId, playlistId, user);

    // Postgres ordena los NULL al final en ASC: las notas sin ancla de tiempo
    // quedan después de las que sí están ancladas cronológicamente.
    const notes = playlistId
      ? await this.trackNoteRepository.find({
          where: { track: { id: trackId }, playlist: { id: playlistId } },
          relations: ['authorUser', 'authorGuest'],
          order: { timestampSeconds: 'ASC', createdAt: 'ASC' },
        })
      : await this.trackNoteRepository.find({
          where: [
            { track: { id: trackId }, playlist: IsNull(), authorUser: { id: user.id } },
            { track: { id: trackId }, playlist: IsNull(), authorGuest: { id: user.id } },
          ],
          relations: ['authorUser', 'authorGuest'],
          order: { timestampSeconds: 'ASC', createdAt: 'ASC' },
        });

    return notes.map((note) => this.toResponseDto(note, trackId, playlistId ?? null));
  }

  async update(id: string, dto: UpdateTrackNoteDto, user: JwtPayload): Promise<TrackNoteResponseDto> {
    const note = await this.findNoteOrFail(id);
    this.assertIsAuthor(note, user);

    if (dto.content !== undefined) {
      note.content = dto.content;
    }
    if (dto.timestampSeconds !== undefined) {
      note.timestampSeconds = dto.timestampSeconds;
    }

    const saved = await this.trackNoteRepository.save(note);
    return this.toResponseDto(saved, note.track.id, note.playlist?.id ?? null);
  }

  async remove(id: string, user: JwtPayload): Promise<void> {
    const note = await this.findNoteOrFail(id);
    this.assertIsAuthor(note, user);

    await this.trackNoteRepository.softRemove(note);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Autorización
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Sin playlistId, exige la capability de plataforma `marketplace.search`.
   * Con playlistId, replica la cascada de `PlaylistPermissionGuard`: los
   * colaboradores de playlist son `Guest` (vía el plan `GUEST` ya tienen esa
   * capability), pero un `User` colaborador (p. ej. plan `AUTOR_*`) puede no
   * tenerla y aun así debe poder anotar dentro de la playlist compartida. Por
   * eso la autorización condicional vive aquí y no en un `@RequireCapability`
   * de ruta.
   */
  private async assertCanAccessNotes(
    trackId: string,
    playlistId: string | undefined,
    user: JwtPayload,
  ): Promise<void> {
    if (!playlistId) {
      const capabilityKeys = await this.authorizationService.getEffectiveCapabilityKeys({
        userId: user.id,
      });
      if (!capabilityKeys.includes(MARKETPLACE_SEARCH_CAPABILITY)) {
        throw new ForbiddenException(
          `Se requiere la capability '${MARKETPLACE_SEARCH_CAPABILITY}' para anotar tracks fuera de una playlist compartida`,
        );
      }
      return;
    }

    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId },
      relations: ['owner', 'tracks'],
    });
    if (!playlist) {
      throw new NotFoundException('Playlist no encontrada');
    }

    await this.assertPlaylistMembership(playlist.id, playlist.owner.id, user);

    const trackBelongsToPlaylist = playlist.tracks?.some((track) => track.id === trackId) ?? false;
    if (!trackBelongsToPlaylist) {
      throw new BadRequestException('El track indicado no pertenece a esta playlist');
    }
  }

  /** Cascada exacta de `PlaylistPermissionGuard`, cualquier nivel de colaboración (READ/WRITE/ADMIN) alcanza. */
  private async assertPlaylistMembership(
    playlistId: string,
    ownerId: string,
    user: JwtPayload,
  ): Promise<void> {
    const moderation = await this.authorizationService.check(
      { userId: user.id },
      { caps: [PLAYLISTS_MODERATE_CAPABILITY], operator: 'AND' },
    );
    if (moderation.allowed) {
      return;
    }

    if (ownerId === user.id) {
      return;
    }

    const collaboratorPermission = await this.playlistCollaboratorsService.getCollaboratorPermission(
      playlistId,
      user.id,
    );
    if (collaboratorPermission) {
      return;
    }

    if (await this.sharingService.hasActivePlaylistAccess(playlistId, user.id)) {
      return;
    }

    throw new ForbiddenException('No tienes acceso a esta playlist');
  }

  private assertIsAuthor(note: TrackNote, user: JwtPayload): void {
    const isAuthor = note.authorUser?.id === user.id || note.authorGuest?.id === user.id;
    if (!isAuthor) {
      throw new ForbiddenException('Solo el autor de la nota puede editarla o eliminarla');
    }
  }

  /** Usado por update/remove: necesita `track`/`playlist` para reconstruir la respuesta plana. */
  private async findNoteOrFail(id: string): Promise<TrackNote> {
    const note = await this.trackNoteRepository.findOne({
      where: { id },
      relations: ['track', 'playlist', 'authorUser', 'authorGuest'],
    });
    if (!note) {
      throw new NotFoundException('Nota no encontrada');
    }
    return note;
  }

  private async findNoteWithAuthorOrFail(id: string): Promise<TrackNote> {
    const note = await this.trackNoteRepository.findOne({
      where: { id },
      relations: ['authorUser', 'authorGuest'],
    });
    if (!note) {
      throw new NotFoundException('Nota no encontrada');
    }
    return note;
  }

  /** Aplana la entidad a la forma que consume el frontend, resolviendo el nombre del autor polimórfico. */
  private toResponseDto(
    note: TrackNote,
    trackId: string,
    playlistId: string | null,
  ): TrackNoteResponseDto {
    const isGuestAuthor = Boolean(note.authorGuest);
    const author = isGuestAuthor ? note.authorGuest! : note.authorUser!;

    return {
      id: note.id,
      trackId,
      playlistId,
      authorId: author.id,
      authorName: `${author.name} ${author.lastName}`.trim(),
      authorType: isGuestAuthor ? 'GUEST' : 'USER',
      content: note.content,
      timestampSeconds: note.timestampSeconds,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }
}
