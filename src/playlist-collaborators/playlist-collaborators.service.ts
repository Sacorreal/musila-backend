import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { Guest } from 'src/guests/entities/guest.entity';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { UserRole } from 'src/users/entities/user-role.enum';
import { Repository } from 'typeorm';
import { AddCollaboratorDto } from './dto/add-collaborator.dto';
import { CollaboratorPermission } from './entities/collaborator-permission.enum';
import { PlaylistCollaborator } from './entities/playlist-collaborator.entity';

@Injectable()
export class PlaylistCollaboratorsService {
  private readonly logger = new Logger(PlaylistCollaboratorsService.name);

  constructor(
    @InjectRepository(PlaylistCollaborator)
    private readonly collaboratorRepository: Repository<PlaylistCollaborator>,
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(Guest)
    private readonly guestRepository: Repository<Guest>,
   
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Métodos públicos
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Agrega un colaborador a una playlist.
   *
   * Validaciones:
   * 1. La playlist existe y el usuario autenticado es su dueño (o es admin)
   * 2. El guest existe y pertenece al usuario autenticado (invited_by)
   * 3. El guest no es ya colaborador de la playlist
   */
  async addCollaborator(
    playlistId: string,
    dto: AddCollaboratorDto,
    user: JwtPayload,
  ): Promise<PlaylistCollaborator> {
    // 1. Validar playlist y propiedad
    const playlist = await this.findPlaylistOrFail(playlistId);
    this.assertOwnership(playlist, user);

    // 2. Validar guest y que pertenezca al usuario
    const guest = await this.findGuestOrFail(dto.guestId);
    this.assertGuestBelongsToUser(guest, user);

    // 3. Verificar que el guest no sea ya colaborador
    const existingCollaborator = await this.collaboratorRepository.findOne({
      where: { playlist: { id: playlistId }, guest: { id: dto.guestId } },
    });
    if (existingCollaborator) {
      throw new ConflictException('El invitado ya es colaborador de esta playlist');
    }

    // 4. Crear la relación
    const collaborator = this.collaboratorRepository.create({
      playlist,
      guest,
      permission: dto.permission ?? CollaboratorPermission.READ,
    });

    const saved = await this.collaboratorRepository.save(collaborator);
    const result = await this.findCollaboratorWithRelations(saved.id);

    // Emitir notificación en tiempo real a todos los miembros del room de la playlist
    

    return result;
  }

  /**
   * Agrega multiples colaboradores a una playlist.
   */
  async addMultipleCollaborators(
    playlistId: string,
    dto: import('./dto/add-multiple-collaborators.dto').AddMultipleCollaboratorsDto,
    user: JwtPayload,
  ): Promise<PlaylistCollaborator[]> {
    const playlist = await this.findPlaylistOrFail(playlistId);
    this.assertOwnership(playlist, user);

    const addedCollaborators: PlaylistCollaborator[] = [];

    for (const collabDto of dto.collaborators) {
      try {
        const guest = await this.findGuestOrFail(collabDto.guestId);
        this.assertGuestBelongsToUser(guest, user);

        const existingCollaborator = await this.collaboratorRepository.findOne({
          where: { playlist: { id: playlistId }, guest: { id: collabDto.guestId } },
        });

        if (!existingCollaborator) {
          const collaborator = this.collaboratorRepository.create({
            playlist,
            guest,
            permission: collabDto.permission ?? CollaboratorPermission.READ,
          });
          const saved = await this.collaboratorRepository.save(collaborator);
          const result = await this.findCollaboratorWithRelations(saved.id);
          addedCollaborators.push(result);
        }
      } catch (error) {
        // Ignoramos errores individuales para seguir con el resto
        this.logger.error(`Error agregando colaborador ${collabDto.guestId}:`, error);
      }
    }

    return addedCollaborators;
  }

  /**
   * Elimina un colaborador de una playlist.
   */
  async removeCollaborator(
    playlistId: string,
    guestId: string,
    user: JwtPayload,
  ): Promise<{ message: string }> {
    // 1. Validar playlist y propiedad
    const playlist = await this.findPlaylistOrFail(playlistId);
    this.assertOwnership(playlist, user);

    // 2. Buscar la relación
    const collaborator = await this.collaboratorRepository.findOne({
      where: { playlist: { id: playlistId }, guest: { id: guestId } },
    });
    if (!collaborator) {
      throw new NotFoundException('El invitado no es colaborador de esta playlist');
    }

    await this.collaboratorRepository.remove(collaborator);

    return { message: 'Colaborador eliminado exitosamente' };
  }

  /**
   * Obtiene todos los colaboradores de una playlist.
   */
  async getCollaborators(
    playlistId: string,
    user: JwtPayload,
  ): Promise<PlaylistCollaborator[]> {
    // Validar playlist y propiedad
    const playlist = await this.findPlaylistOrFail(playlistId);
    this.assertOwnership(playlist, user);

    return this.collaboratorRepository.find({
      where: { playlist: { id: playlistId } },
      relations: ['guest'],
      order: { createdAt: 'ASC' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Métodos públicos auxiliares (usados por PlaylistPermissionGuard)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Busca la playlist con su owner cargado. Lanza NotFoundException si no existe.
   */
  async findPlaylistWithOwner(playlistId: string): Promise<Playlist> {
    return this.findPlaylistOrFail(playlistId);
  }

  /**
   * Retorna el permiso del colaborador en la playlist, o null si no es colaborador.
   */
  async getCollaboratorPermission(
    playlistId: string,
    guestId: string,
  ): Promise<CollaboratorPermission | null> {
    const collaborator = await this.collaboratorRepository.findOne({
      where: {
        playlist: { id: playlistId },
        guest: { id: guestId },
      },
    });
    return collaborator?.permission ?? null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Métodos privados auxiliares
  // ─────────────────────────────────────────────────────────────────────────────

  private async findPlaylistOrFail(id: string): Promise<Playlist> {
    const playlist = await this.playlistRepository.findOne({
      where: { id },
      relations: ['owner'],
    });
    if (!playlist) {
      throw new NotFoundException('Playlist no encontrada');
    }
    return playlist;
  }

  private async findGuestOrFail(id: string): Promise<Guest> {
    const guest = await this.guestRepository.findOne({
      where: { id },
      relations: ['invited_by'],
    });
    if (!guest) {
      throw new NotFoundException('Invitado no encontrado');
    }
    return guest;
  }

  private async findCollaboratorWithRelations(
    id: string,
  ): Promise<PlaylistCollaborator> {
    const collaborator = await this.collaboratorRepository.findOne({
      where: { id },
      relations: ['playlist', 'guest'],
    });
    if (!collaborator) {
      throw new NotFoundException('Colaborador no encontrado');
    }
    return collaborator;
  }

  /**
   * Verifica que el usuario autenticado sea dueño de la playlist (o admin).
   */
  private assertOwnership(playlist: Playlist, user: JwtPayload): void {
    if (playlist.owner.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permisos para gestionar esta playlist');
    }
  }

  /**
   * Verifica que el guest haya sido invitado por el usuario autenticado.
   */
  private assertGuestBelongsToUser(guest: Guest, user: JwtPayload): void {
    if (guest.invited_by.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Este invitado no pertenece a tu red de colaboradores');
    }
  }
}
