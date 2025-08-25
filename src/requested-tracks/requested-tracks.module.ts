import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { RequestedTrack } from './entities/requested-track.entity';
import { RequestedTracksResolver } from './requested-tracks.resolver';
import { RequestedTracksService } from './requested-tracks.service';

@Module({
  imports: [TypeOrmModule.forFeature([RequestedTrack, User, Track])],
  providers: [RequestedTracksResolver, RequestedTracksService],
})
export class RequestedTracksModule {}
