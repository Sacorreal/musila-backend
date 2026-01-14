import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { User } from 'src/users/entities/user.entity';
import { Track } from './entities/track.entity';
import { TracksController } from './tracks.controller';
import { TracksService } from './tracks.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Track, User, MusicalGenre]),
    UsersModule
  ],
  controllers: [TracksController],
  providers: [TracksService],
})
export class TracksModule { }
