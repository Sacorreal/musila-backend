import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { User } from 'src/users/entities/user.entity';

import { IntellectualProperty } from 'src/intellectual-property/entities/intellectual-property.entity';
import { Track } from './entities/track.entity';
import { TracksResolver } from './tracks.resolver';
import { TracksService } from './tracks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Track, User, MusicalGenre, IntellectualProperty]),
  ],
  providers: [TracksResolver, TracksService],
})
export class TracksModule {}
