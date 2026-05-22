import { ApiProperty } from '@nestjs/swagger';
import { RequestedTrack } from '../entities/requested-track.entity';

export class PaginatedRequestedTracksResponseDto {
  @ApiProperty({ type: [RequestedTrack], description: 'Lista de pistas solicitadas' })
  data: RequestedTrack[];

  @ApiProperty({
    example: 10,
    description: 'Total de pistas solicitadas que coinciden con la consulta',
  })
  total: number;
}
