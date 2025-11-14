import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from 'src/tracks/entities/track.entity';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Track, MusicalGenre, User])],
  controllers: [SearchController],
  providers: [SearchService]
})
export class SearchModule {}
