import { Injectable, NotFoundException } from '@nestjs/common';
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

  async createPlaylistsService(createPlaylistInput: CreatePlaylistInput) {
    const {
      owner: ownerId,
      guestIds = [],
      trackIds = [],
      ...rest
    } = createPlaylistInput;

    const owner = await this.usersRepository.findOne({
      where: { id: ownerId },
    });
    if (!owner)
      throw new NotFoundException('Usuario propietario no encontrado');

    let guests: Guest[] = [];

    if (guestIds.length > 0) {
      guests = await this.guestsRepository.find({
        where: { id: In(guestIds) },
      });
      if (guests.length !== guestIds.length)
        throw new NotFoundException('Uno o más invitados no existen');
    }

    let tracks: Track[] = [];
    if (trackIds.length > 0) {
      tracks = await this.tracksRepository.find({
        where: { id: In(trackIds) },
      });
      if (tracks.length !== trackIds.length)
        throw new NotFoundException('Una o más canciones no existen');
    }

    const newPlaylist = this.playlistRepository.create({
      ...rest,
      owner,
      guests,
      tracks,
    });

    return await this.saveAndReturnWithRelations(newPlaylist);
  }

  async findAllPlaylistsService(user: JwtPayload) {
    if (user.role == UserRole.INVITADO) {
      const guestFound = await this.guestsRepository.findOneBy({ id: user.id });
      if (!guestFound) {
        throw new NotFoundException('Invitado no encontrado');
      }
      return await this.playlistRepository.find({
        where: {
          guests: { id: guestFound.id },
        },
        relations: playlistsRelations,
      });
    }
    const userFound =
      (await this.usersRepository.findOneBy({ id: user.id })) ?? user;

    return await this.playlistRepository.find({
      where: {
        owner: userFound,
      },
      relations: playlistsRelations,
    });
  }

  async findOnePlaylistsService(id: string) {
    return await this.findPlaylistWithRelations(id);
  }

  async updatePlaylistsService(
    id: string,
    updatePlaylistInput: UpdatePlaylistInput,
  ) {
    const existingPlaylist = await this.findPlaylistWithRelations(id);

    const { guestIds, trackIds, owner: ownerId, ...rest } = updatePlaylistInput;

    if (ownerId) {
      const owner = await this.usersRepository.findOne({
        where: { id: ownerId },
      });
      if (!owner)
        throw new NotFoundException('Usuario propietario no encontrado');
      existingPlaylist.owner = owner;
    }

    if (guestIds) {
      const guests = await this.guestsRepository.find({
        where: { id: In(guestIds) },
      });
      if (guests.length !== guestIds.length)
        throw new NotFoundException('Uno o más invitados no existen');
      existingPlaylist.guests = guests;
    }

    if (trackIds) {
      const tracks = await this.tracksRepository.find({
        where: { id: In(trackIds) },
      });
      if (tracks.length !== trackIds.length)
        throw new NotFoundException('Una o más canciones no existen');
      existingPlaylist.tracks = tracks;
    }

    Object.assign(existingPlaylist, rest);

    return await this.saveAndReturnWithRelations(existingPlaylist);
  }

  async removePlaylistsService(id: string) {
    const playlistToRemove = await this.findPlaylistWithRelations(id);

    await this.playlistRepository.softRemove(playlistToRemove);

    return playlistToRemove;
  }
}
