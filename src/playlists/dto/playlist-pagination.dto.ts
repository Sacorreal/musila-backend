import { ApiProperty } from '@nestjs/swagger';
import { Playlist } from '../entities/playlist.entity';

export class PaginatedPlaylistsResponseDto {
  @ApiProperty({ type: [Playlist], description: 'Lista de listas de reproducción' })
  data: Playlist[];

  @ApiProperty({
    example: 10,
    description: 'Total de listas de reproducción que coinciden con la consulta',
  })
  total: number;
}
