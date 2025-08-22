import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreatePlaylistInput } from './dto/create-playlist.input';
import { UpdatePlaylistInput } from './dto/update-playlist.input';
import { Playlist } from './entities/playlist.entity';
import { PlaylistsService } from './playlists.service';

@Resolver(() => Playlist)
export class PlaylistsResolver {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Mutation(() => Playlist)
  createPlaylist(
    @Args('createPlaylistInput') createPlaylistInput: CreatePlaylistInput,
  ) {
    return this.playlistsService.create(createPlaylistInput);
  }

  @Query(() => [Playlist], { name: 'playlists' })
  findAll() {
    return this.playlistsService.findAll();
  }

  @Query(() => Playlist, { name: 'playlist' })
  findOne(@Args('id', { type: () => String }) id: string) {
    return this.playlistsService.findOne(id);
  }

  @Mutation(() => Playlist)
  updatePlaylist(
    @Args('updatePlaylistInput') updatePlaylistInput: UpdatePlaylistInput,
  ) {
    return this.playlistsService.update(
      updatePlaylistInput.id,
      updatePlaylistInput,
    );
  }

  @Mutation(() => Playlist)
  removePlaylist(@Args('id', { type: () => String }) id: string) {
    return this.playlistsService.remove(id);
  }
}
