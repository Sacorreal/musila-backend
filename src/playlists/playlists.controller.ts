import { PlaylistsService } from './playlists.service';
import { CreatePlaylistInput } from './dto/create-playlist.input';
import { UpdatePlaylistInput } from './dto/update-playlist.input';
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Playlists')
@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) { }

  @Post()
  async createPlaylistsController(@Body() createPlaylistInput: CreatePlaylistInput) {
    return await this.playlistsService.createPlaylistsService(createPlaylistInput);
  }

  @Get()
  async findAllPlaylistsController() {
    return await this.playlistsService.findAllPlaylistsService();
  }

  @Get(':id')
  async findOnePlaylistsController(@Param('id') id: string) {
    return await this.playlistsService.findOnePlaylistsService(id);
  }

  @Put('id')
  async updatePlaylistsController(@Body() updatePlaylistInput: UpdatePlaylistInput, @Param('id') id: string) {
    return await this.playlistsService.updatePlaylistsService(id, updatePlaylistInput);
  }

  @Delete(':id')
  async removePlaylistsController(@Param('id') id: string) {
    return await this.playlistsService.removePlaylistsService(id);
  }
}
