import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { Guest } from 'src/guests/entities/guest.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { UserRole } from 'src/users/entities/user-role.enum';
import { User } from 'src/users/entities/user.entity';
import { In, Repository } from 'typeorm';
import { CreatePlaylistInput } from './dto/create-playlist.input';
import { UpdatePlaylistInput } from './dto/update-playlist.input';
import { Playlist } from './entities/playlist.entity';



const playlistsRelations: string[] = ['owner', 'guests', 'tracks'];

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Guest)
    private readonly guestsRepository: Repository<Guest>,
    @InjectRepository(Track)
    private readonly tracksRepository: Repository<Track>,
  ) {}

  private async findPlaylistWithRelations(id: string): Promise<Playlist> {
    const playlist = await this.playlistRepository.findOne({
      where: { id },
      relations: playlistsRelations,
    });

    if (!playlist) throw new NotFoundException('Playlist no encontrada');

    return playlist;
  }

  private async saveAndReturnWithRelations(
    playlist: Playlist,
  ): Promise<Playlist> {
    const savedPlaylist = await this.playlistRepository.save(playlist);
    return this.findPlaylistWithRelations(savedPlaylist.id);
  }

  async createPlaylistsService(createPlaylistInput: CreatePlaylistInput, user: JwtPayload): Promise<Playlist> {  

    const owner = await this.usersRepository.findOne({
      where: { id: user.id },
    });
    if (!owner)
      throw new NotFoundException('Usuario propietario no encontrado');  

    const newPlaylist = this.playlistRepository.create({
      title: createPlaylistInput.title
    });

    return await this.saveAndReturnWithRelations(newPlaylist);
  }

  async findAllPlaylistsService(user: JwtPayload) {
    // 1. Construimos la condición de búsqueda dinámicamente según el rol
    const whereCondition =
      user.role === UserRole.INVITADO
        ? { guests: { id: user.id } } // Si es invitado, busca en el array de invitados
        : { owner: { id: user.id } }; // Para el resto, busca por propietario

    // 2. Ejecutamos una sola consulta directa a la base de datos
    return await this.playlistRepository.find({
      where: whereCondition,
      relations: playlistsRelations,
    });
  }

  async findOnePlaylistsService(id: string) {
    return await this.findPlaylistWithRelations(id);
  }

  async updatePlaylistsService(    
    updatePlaylistInput: UpdatePlaylistInput,
    owner: JwtPayload
  ) {
    const existingPlaylist = await this.findPlaylistWithRelations(updatePlaylistInput.id);

    // 1. Autorización: Evitar que un usuario modifique playlists de otros
    if (existingPlaylist.owner.id !== owner.id && owner.role !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permisos para editar esta playlist');
    }

    // Extraemos los IDs y descartamos 'ownerId' del body por seguridad
    const { guestIds, trackIds,...rest } = updatePlaylistInput;

    // 2. Optimización: Consultas en paralelo (Reduce a la mitad el tiempo de espera)
    const [guests, tracks] = await Promise.all([
      guestIds ? this.guestsRepository.findBy({ id: In(guestIds) }) : Promise.resolve(null),
      trackIds ? this.tracksRepository.findBy({ id: In(trackIds) }) : Promise.resolve(null),
    ]);

    // 3. Validaciones y asignación
    if (guests && guests.length !== guestIds?.length) throw new NotFoundException('Uno o más invitados no existen');
    if (tracks && tracks.length !== trackIds?.length) throw new NotFoundException('Una o más canciones no existen');

    Object.assign(existingPlaylist, {
      ...(guests && { guests }),
      ...(tracks && { tracks }),
      ...rest, 
    });

    return await this.saveAndReturnWithRelations(existingPlaylist);
  }

  async removePlaylistsService(id: string) {
    const playlistToRemove = await this.findPlaylistWithRelations(id);

    await this.playlistRepository.softRemove(playlistToRemove);

    return playlistToRemove;
  }
}
