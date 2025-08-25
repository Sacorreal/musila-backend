import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { PlaylistsService } from './playlists.service';
import { Playlist } from './entities/playlist.entity';
import { CreatePlaylistInput } from './dto/create-playlist.input';
import { UpdatePlaylistInput } from './dto/update-playlist.input';


@Resolver(() => Playlist)
export class PlaylistsResolver {
  constructor(private readonly playlistsService: PlaylistsService) { }

  @Mutation(() => Playlist)
  createPlaylistsResolver(@Args('createPlaylistInput') createPlaylistInput: CreatePlaylistInput) {
    return this.playlistsService.createPlaylistsService(createPlaylistInput);
  }

  @Query(() => [Playlist], { name: 'playlists' })
  findAllPlaylistsResolver() {
    return this.playlistsService.findAllPlaylistsService();
  }

  @Query(() => Playlist, { name: 'playlist' })
  findOnePlaylistsResolver(@Args('id', { type: () => ID }) id: string) {
    return this.playlistsService.findOnePlaylistsService(id);
  }

  @Mutation(() => Playlist)
  updatePlaylistsResolver(@Args('updatePlaylistInput') updatePlaylistInput: UpdatePlaylistInput) {
    return this.playlistsService.updatePlaylistsService(updatePlaylistInput.id, updatePlaylistInput);
  }

  @Mutation(() => Playlist)
  removePlaylistsResolver(@Args('id', { type: () => ID }) id: string) {
    return this.playlistsService.removePlaylistsService(id);
  }
}
