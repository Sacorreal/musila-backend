import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';
import { RequestedTrack } from './entities/requested-track.entity';
import { RequestedTracksController } from './requested-tracks.controller';
import { RequestedTracksService } from './requested-tracks.service';
import { Chat } from 'src/chat/entities/chat.entity';
import { Message } from 'src/chat/entities/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RequestedTrack, User, Track, Chat, Message]), UsersModule],
  controllers: [RequestedTracksController],
  providers: [RequestedTracksService],
})
export class RequestedTracksModule { }
