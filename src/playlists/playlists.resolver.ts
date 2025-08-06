import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { PlaylistsService } from './playlists.service';
import { Playlist } from './entities/playlist.entity';
import { CreatePlaylistInput } from './dto/create-playlist.input';
import { UpdatePlaylistInput } from './dto/update-playlist.input';

@Resolver(() => Playlist)
export class PlaylistsResolver {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Mutation(() => Playlist)
  createPlaylist(@Args('createPlaylistInput') createPlaylistInput: CreatePlaylistInput) {
    return this.playlistsService.create(createPlaylistInput);
  }

  @Query(() => [Playlist], { name: 'playlists' })
  findAll() {
    return this.playlistsService.findAll();
  }

  @Query(() => Playlist, { name: 'playlist' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.playlistsService.findOne(id);
  }

  @Mutation(() => Playlist)
  updatePlaylist(@Args('updatePlaylistInput') updatePlaylistInput: UpdatePlaylistInput) {
    return this.playlistsService.update(updatePlaylistInput.id, updatePlaylistInput);
  }

  @Mutation(() => Playlist)
  removePlaylist(@Args('id', { type: () => Int }) id: number) {
    return this.playlistsService.remove(id);
  }
}
