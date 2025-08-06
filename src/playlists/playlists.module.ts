import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Playlist } from './entities/playlist.entity';
import { PlaylistsResolver } from './playlists.resolver';
import { PlaylistsService } from './playlists.service';

@Module({
  imports: [TypeOrmModule.forFeature([Playlist])],
  providers: [PlaylistsResolver, PlaylistsService],
})
export class PlaylistsModule {}
