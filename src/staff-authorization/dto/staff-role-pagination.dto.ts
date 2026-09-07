import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export class StaffRolePaginationDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por nombre (búsqueda parcial)' })
  @IsOptional()
  @IsString()
  search?: string;
}
