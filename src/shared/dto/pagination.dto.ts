import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Cantidad de registros a retornar',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number) // Convierte el string de la query a número
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Cantidad de registros a saltar (paginación)',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}