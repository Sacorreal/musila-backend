import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export class AuditLogPaginationDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por usuario' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por acción (búsqueda parcial)' })
  @IsOptional()
  @IsString()
  action?: string;
}
