import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMoodInput {
  @ApiProperty({
    example: 'Alegre',
    description: 'Nombre del mood.',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Slug del mood (auto-generado si se omite)', example: 'alegre' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({
    description: 'Categoría del mood (agrupación del catálogo, ej: Emociones positivas)',
    example: 'Emociones positivas',
  })
  @IsString()
  @IsOptional()
  category?: string;
}
