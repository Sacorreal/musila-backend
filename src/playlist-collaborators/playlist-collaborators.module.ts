import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guest } from 'src/guests/entities/guest.entity';

import { Playlist } from 'src/playlists/entities/playlist.entity';
import { PlaylistCollaborator } from './entities/playlist-collaborator.entity';
import { PlaylistCollaboratorsController } from './playlist-collaborators.controller';
import { PlaylistCollaboratorsService } from './playlist-collaborators.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlaylistCollaborator, Playlist, Guest]),
  
  ],
  controllers: [PlaylistCollaboratorsController],
  providers: [PlaylistCollaboratorsService],
  exports: [PlaylistCollaboratorsService],
})
export class PlaylistCollaboratorsModule {}

