import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';
import { Track } from './entities/track.entity';
import { TracksResolver } from './tracks.resolver';
import { TracksService } from './tracks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Track]), UsersModule],
  providers: [TracksResolver, TracksService],
})
export class TracksModule {}
