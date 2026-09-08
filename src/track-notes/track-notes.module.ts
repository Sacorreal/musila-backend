import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guest } from 'src/guests/entities/guest.entity';
import { PlaylistCollaboratorsModule } from 'src/playlist-collaborators/playlist-collaborators.module';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { SharingModule } from 'src/sharing/sharing.module';
import { Track } from 'src/tracks/entities/track.entity';
import { TrackNote } from './entities/track-note.entity';
import { TrackNotesController } from './track-notes.controller';
import { TrackNotesService } from './track-notes.service';

// AuthorizationService no se importa explícitamente: AuthorizationModule es
// @Global() (mismo patrón que PlaylistsModule/RequestedTracksModule).
@Module({
  imports: [
    TypeOrmModule.forFeature([TrackNote, Track, Playlist, Guest]),
    PlaylistCollaboratorsModule,
    SharingModule,
  ],
  controllers: [TrackNotesController],
  providers: [TrackNotesService],
  exports: [TrackNotesService],
})
export class TrackNotesModule {}
