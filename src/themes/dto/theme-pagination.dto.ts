import { ApiProperty } from '@nestjs/swagger';
import { Theme } from '../entities/theme.entity';

export class PaginatedThemeResponseDto {
  @ApiProperty({ type: [Theme], description: 'Lista de temas' })
  data: Theme[];

  @ApiProperty({
    example: 10,
    description: 'Total de temas que coinciden con la consulta',
  })
  total: number;
}
