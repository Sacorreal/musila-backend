import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePlaylistInput } from './dto/create-playlist.input';
import { UpdatePlaylistInput } from './dto/update-playlist.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Playlist } from './entities/playlist.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectRepository(Playlist) private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>) { }

  async createPlaylistsService(createPlaylistInput: CreatePlaylistInput) {

    const owner = await this.usersRepository.findOne({ where: { id: createPlaylistInput.owner } })

    if (!owner) throw new NotFoundException('El usuario al que se le quiere aplicar la playlist no existe')

    const newPlaylist = this.playlistRepository.create({ ...createPlaylistInput, owner })

    return await this.playlistRepository.save(newPlaylist)
  }

  async findAllPlaylistsService() {
    return await this.playlistRepository.find({ relations: ['owner', 'guests', 'tracks'] })
  }

  async findOnePlaylistsService(id: string) {
    return await this.playlistRepository.findOne({ where: { id }, relations: ['owner', 'guests', 'tracks'] })
  }

  async updatePlaylistsService(id: string, updatePlaylistInput: UpdatePlaylistInput) {
    const existingPlaylist = await this.playlistRepository.findOne({ where: { id }, relations: ['owner', 'guests', 'tracks'] })
    if (!existingPlaylist) throw new NotFoundException('Playlist no encontrada')

    Object.assign(existingPlaylist, updatePlaylistInput)

    await this.playlistRepository.save(existingPlaylist)

    return existingPlaylist
  }

  async removePlaylistsService(id: string) {
    const playlistToRemove = await this.playlistRepository.findOne({ where: { id } })
    if (!playlistToRemove) throw new NotFoundException('Playlist no encontrada')

    await this.playlistRepository.remove(playlistToRemove)
    return true
  }
}
