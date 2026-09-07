import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { BlogArticleStatus } from '../entities/blog-article-status.enum';

export class CreateBlogArticleDto {
  @ApiProperty({ example: 'Cómo licenciar tu primera canción', description: 'Título del artículo.' })
  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title: string;

  @ApiProperty({ description: 'Contenido del artículo en formato Markdown.' })
  @IsString()
  @IsNotEmpty({ message: 'El contenido del artículo es obligatorio' })
  contentMarkdown: string;

  @ApiPropertyOptional({ description: 'Resumen corto del artículo (auto-generado si se omite).' })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiPropertyOptional({ description: 'URL pública de la imagen destacada (obtenida tras subir a storage).' })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: 'Key del objeto en storage de la imagen destacada.' })
  @IsOptional()
  @IsString()
  coverImageKey?: string;

  @ApiPropertyOptional({ description: 'URL de YouTube a embeber en el artículo.' })
  @IsOptional()
  @IsString()
  youtubeUrl?: string;

  @ApiPropertyOptional({ enum: BlogArticleStatus, default: BlogArticleStatus.DRAFT })
  @IsOptional()
  @IsEnum(BlogArticleStatus, { message: 'El estado debe ser draft o published' })
  status?: BlogArticleStatus;

  @ApiProperty({
    type: [String],
    description: 'Identificadores (UUID v4) de los autores asignados al artículo (mínimo 1).',
  })
  @IsArray({ message: 'authorIds debe ser un arreglo de UUIDs' })
  @ArrayMinSize(1, { message: 'Selecciona al menos un autor' })
  @IsUUID('4', { each: true, message: 'Cada authorId debe ser un UUID v4 válido' })
  authorIds: string[];

  @ApiProperty({
    type: [String],
    description: 'Identificadores (UUID v4) de las etiquetas/servicios relacionados (mínimo 1).',
  })
  @IsArray({ message: 'tagIds debe ser un arreglo de UUIDs' })
  @ArrayMinSize(1, { message: 'Selecciona al menos una etiqueta' })
  @IsUUID('4', { each: true, message: 'Cada tagId debe ser un UUID v4 válido' })
  tagIds: string[];
}
