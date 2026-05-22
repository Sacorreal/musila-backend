import { ApiProperty } from '@nestjs/swagger';
import { MusicalGenre } from '../entities/musical-genre.entity';

export class PaginatedMusicalGenreResponseDto {
  @ApiProperty({ type: [MusicalGenre], description: 'Lista de géneros musicales' })
  data: MusicalGenre[];

  @ApiProperty({
    example: 10,
    description: 'Total de géneros musicales que coinciden con la consulta',
  })
  total: number;
}
