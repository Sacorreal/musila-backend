import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { BlogArticleStatus } from '../entities/blog-article-status.enum';

export class BlogArticleAdminPaginationDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Buscar por título (búsqueda parcial)', example: 'licencia' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID de autor (UUID v4)' })
  @IsOptional()
  @IsUUID('4', { message: 'El authorId debe ser un UUID v4 válido' })
  authorId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID de etiqueta (UUID v4)' })
  @IsOptional()
  @IsUUID('4', { message: 'El tagId debe ser un UUID v4 válido' })
  tagId?: string;

  @ApiPropertyOptional({ enum: BlogArticleStatus, description: 'Filtrar por estado de publicación' })
  @IsOptional()
  @IsEnum(BlogArticleStatus, { message: 'El estado debe ser draft o published' })
  status?: BlogArticleStatus;

  @ApiPropertyOptional({ description: 'Fecha de creación desde (ISO 8601)', example: '2026-01-01' })
  @IsOptional()
  @IsDateString({}, { message: 'dateFrom debe ser una fecha ISO 8601 válida' })
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha de creación hasta (ISO 8601)', example: '2026-12-31' })
  @IsOptional()
  @IsDateString({}, { message: 'dateTo debe ser una fecha ISO 8601 válida' })
  dateTo?: string;
}
