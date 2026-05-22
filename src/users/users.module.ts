import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AdminService } from './admin.service';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, MusicalGenre, Track, RequestedTrack])],
  controllers: [UsersController],
  providers: [UsersService, AdminService],
  exports: [TypeOrmModule, UsersService, AdminService],
})
export class UsersModule {}
