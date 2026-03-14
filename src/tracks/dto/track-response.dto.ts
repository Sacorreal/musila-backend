import { ApiProperty } from '@nestjs/swagger';
import { Track } from '../entities/track.entity';

export class PaginatedTracksResponseDto {
  @ApiProperty({ type: [Track], description: 'Lista de tracks' })
  data: Track[];

  @ApiProperty({ example: 100, description: 'Total de tracks que coinciden con el filtro' })
  total: number;
}