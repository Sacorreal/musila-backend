import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MusicalGenre } from './entities/musical-genre.entity';
import { MusicalGenreController } from './musical-genre.controller';
import { MusicalGenreService } from './musical-genre.service';
import { Track } from 'src/tracks/entities/track.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MusicalGenre, Track])],
  controllers: [MusicalGenreController],
  providers: [MusicalGenreService],
})
export class MusicalGenreModule { }
