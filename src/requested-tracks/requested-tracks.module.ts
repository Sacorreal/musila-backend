import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { RequestedTrack } from './entities/requested-track.entity';
import { RequestedTracksController } from './requested-tracks.controller';
import { RequestedTracksService } from './requested-tracks.service';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([RequestedTrack, User, Track]), MailModule],
  controllers: [RequestedTracksController],
  providers: [RequestedTracksService],
})
export class RequestedTracksModule { }
