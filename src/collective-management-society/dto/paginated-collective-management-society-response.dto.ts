import { ApiProperty } from '@nestjs/swagger';
import { CollectiveManagementSociety } from '../entities/collective-management-society.entity';

export class PaginatedCollectiveManagementSocietyResponseDto {
  @ApiProperty({ type: [CollectiveManagementSociety], description: 'Lista de sociedades de gestión colectiva' })
  data: CollectiveManagementSociety[];

  @ApiProperty({ example: 40, description: 'Total de sociedades que coinciden con la consulta' })
  total: number;
}
