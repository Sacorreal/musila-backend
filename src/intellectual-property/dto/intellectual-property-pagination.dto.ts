import { ApiProperty } from '@nestjs/swagger';
import { IntellectualProperty } from '../entities/intellectual-property.entity';

export class PaginatedIntellectualPropertyResponseDto {
  @ApiProperty({ type: [IntellectualProperty], description: 'Lista de propiedades intelectuales' })
  data: IntellectualProperty[];

  @ApiProperty({
    example: 10,
    description: 'Total de propiedades intelectuales que coinciden con la consulta',
  })
  total: number;
}
