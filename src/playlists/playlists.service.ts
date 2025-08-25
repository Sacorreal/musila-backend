import { Injectable } from '@nestjs/common';
import { CreatePlaylistInput } from './dto/create-playlist.input';
import { UpdatePlaylistInput } from './dto/update-playlist.input';

@Injectable()
export class PlaylistsService {
  create(createPlaylistInput: CreatePlaylistInput) {
    return 'This action adds a new playlist';
  }

  findAll() {
    return `This action returns all playlists`;
  }

  findOne(id: string) {
    return `This action returns a #${id} playlist`;
  }

  update(id: string, updatePlaylistInput: UpdatePlaylistInput) {
    return `This action updates a #${id} playlist`;
  }

  remove(id: string) {
    return `This action removes a #${id} playlist`;
  }
}
