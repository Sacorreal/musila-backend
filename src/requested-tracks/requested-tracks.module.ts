import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestedTrack } from './entities/requested-track.entity';
import { RequestedTracksResolver } from './requested-tracks.resolver';
import { RequestedTracksService } from './requested-tracks.service';

@Module({
  imports: [TypeOrmModule.forFeature([RequestedTrack])],
  providers: [RequestedTracksResolver, RequestedTracksService],
})
export class RequestedTracksModule {}
