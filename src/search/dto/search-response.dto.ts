import { ApiProperty } from '@nestjs/swagger';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { TrackResponseDto } from 'src/tracks/dto/track-response.dto';
import { User } from 'src/users/entities/user.entity';

/** DTO ligero de autor para resultados de búsqueda: sin email/phone/citizenId/plan. */
export class SearchAuthorDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) lastName?: string;
  @ApiProperty({ nullable: true }) avatarUrl?: string;
  @ApiProperty() role: string;

  static fromUser(user: User): SearchAuthorDto {
    const dto = new SearchAuthorDto();
    dto.id = user.id;
    dto.name = user.name;
    dto.lastName = user.lastName;
    dto.avatarUrl = user.avatarUrl;
    dto.role = user.role;
    return dto;
  }
}

export class SearchMetaDto {
  @ApiProperty() limit: number;
  @ApiProperty() tracksTotal: number;
  @ApiProperty() genresTotal: number;
  @ApiProperty() authorsTotal: number;
  @ApiProperty() hasMoreTracks: boolean;
  @ApiProperty() hasMoreAuthors: boolean;
  @ApiProperty() hasMoreGenres: boolean;
}

export class SearchResponseDto {
  @ApiProperty({ type: [TrackResponseDto], description: 'Pistas musicales encontradas' })
  tracks: TrackResponseDto[];

  @ApiProperty({ type: [MusicalGenre], description: 'Géneros musicales encontrados' })
  musicalGenres: MusicalGenre[];

  @ApiProperty({ type: [SearchAuthorDto], description: 'Autores/cantautores encontrados' })
  authors: SearchAuthorDto[];

  @ApiProperty({ type: SearchMetaDto })
  meta: SearchMetaDto;
}
