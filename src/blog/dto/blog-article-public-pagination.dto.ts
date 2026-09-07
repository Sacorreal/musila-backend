import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export class BlogArticlePublicPaginationDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Buscar por título (búsqueda parcial)', example: 'licencia' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID de etiqueta/servicio relacionado (UUID v4)' })
  @IsOptional()
  @IsUUID('4', { message: 'El tagId debe ser un UUID v4 válido' })
  tagId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por slug de autor' })
  @IsOptional()
  @IsString()
  authorSlug?: string;
}
