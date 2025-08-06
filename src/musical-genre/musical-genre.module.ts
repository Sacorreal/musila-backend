import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MusicalGenre } from './entities/musical-genre.entity';
import { MusicalGenreResolver } from './musical-genre.resolver';
import { MusicalGenreService } from './musical-genre.service';

@Module({
  imports: [TypeOrmModule.forFeature([MusicalGenre])],
  providers: [MusicalGenreResolver, MusicalGenreService],
})
export class MusicalGenreModule {}
