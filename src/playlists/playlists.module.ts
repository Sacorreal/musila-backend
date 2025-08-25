import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guest } from 'src/guests/entities/guest.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { Playlist } from './entities/playlist.entity';
import { PlaylistsResolver } from './playlists.resolver';
import { PlaylistsService } from './playlists.service';

@Module({
  imports: [TypeOrmModule.forFeature([Playlist, Guest, User, Track])],
  providers: [PlaylistsResolver, PlaylistsService],
})
export class PlaylistsModule {}
