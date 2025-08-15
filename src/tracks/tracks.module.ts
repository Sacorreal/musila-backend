import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Track } from './entities/track.entity';
import { TracksResolver } from './tracks.resolver';
import { TracksService } from './tracks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Track, User])],
  providers: [TracksResolver, TracksService],
})
export class TracksModule {}
