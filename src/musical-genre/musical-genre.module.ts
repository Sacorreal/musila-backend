import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MusicalGenre } from './entities/musical-genre.entity';
import { MusicalGenreController } from './musical-genre.controller';
import { MusicalGenreService } from './musical-genre.service';

@Module({
  imports: [TypeOrmModule.forFeature([MusicalGenre])],
  providers: [MusicalGenreController, MusicalGenreService],
})
export class MusicalGenreModule { }
