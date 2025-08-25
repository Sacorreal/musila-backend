import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Playlist } from './entities/playlist.entity';
import { PlaylistsResolver } from './playlists.resolver';
import { PlaylistsService } from './playlists.service';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Playlist, User])],
  providers: [PlaylistsResolver, PlaylistsService],
})
export class PlaylistsModule { }
