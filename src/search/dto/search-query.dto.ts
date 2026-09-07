import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export class SearchQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Término de búsqueda',
    example: 'rock',
  })
  @IsString()
  @IsNotEmpty({ message: 'El parámetro de búsqueda "q" es requerido' })
  q: string;

  @ApiPropertyOptional({
    description: 'Cantidad máxima de resultados por categoría (tracks, géneros, autores)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
