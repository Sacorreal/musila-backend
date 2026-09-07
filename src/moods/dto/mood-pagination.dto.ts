import { ApiProperty } from '@nestjs/swagger';
import { Mood } from '../entities/mood.entity';

export class PaginatedMoodResponseDto {
  @ApiProperty({ type: [Mood], description: 'Lista de moods' })
  data: Mood[];

  @ApiProperty({
    example: 10,
    description: 'Total de moods que coinciden con la consulta',
  })
  total: number;
}
