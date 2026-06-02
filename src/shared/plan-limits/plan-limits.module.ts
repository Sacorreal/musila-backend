import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaylistCollaborator } from 'src/playlist-collaborators/entities/playlist-collaborator.entity';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { PlanLimitsGuard } from '../guards/plan-limits.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, Track, RequestedTrack, Playlist, PlaylistCollaborator])],
  providers: [PlanLimitsGuard],
  exports: [PlanLimitsGuard],
})
export class PlanLimitsModule {}
