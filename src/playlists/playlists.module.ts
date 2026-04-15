import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Playlist } from './entities/playlist.entity';
import { PlaylistsController } from './playlists.controller';
import { PlaylistsService } from './playlists.service';
import { User } from 'src/users/entities/user.entity';
import { Guest } from 'src/guests/entities/guest.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { PlaylistCollaboratorsModule } from 'src/playlist-collaborators/playlist-collaborators.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([Playlist, User, Guest, Track]),
    PlaylistCollaboratorsModule
  ],
  controllers: [PlaylistsController],
  providers: [PlaylistsService],
})
export class PlaylistsModule {}
