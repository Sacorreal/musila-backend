import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export class StaffMemberPaginationDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por nombre o email (búsqueda parcial)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por rol interno' })
  @IsOptional()
  @IsUUID()
  staffRoleId?: string;
}
