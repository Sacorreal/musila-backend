import { ApiProperty } from '@nestjs/swagger';
import { Guest } from '../entities/guest.entity';

export class PaginatedGuestsResponseDto {
  @ApiProperty({ type: [Guest], description: 'Lista de invitados' })
  data: Guest[];

  @ApiProperty({
    example: 10,
    description: 'Total de invitados que coinciden con la consulta',
  })
  total: number;
}
