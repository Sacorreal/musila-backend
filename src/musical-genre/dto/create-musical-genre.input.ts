import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMusicalGenreInput {
  @ApiProperty({
    example: 'Rock',
    description: 'Nombre del género musical principal.',
  })
  @IsString()
  @IsNotEmpty()
  genre: string;

  @ApiPropertyOptional({
    example: ['Hard Rock', 'Rock Alternativo', 'Indie Rock'],
    description:
      'Lista de ritmos asociados al género principal. Este campo es opcional.',
  })
  @IsArray()
  @IsOptional()
  ritmo?: string[];

  @ApiPropertyOptional({ description: 'Slug del género musical (auto-generado si se omite)', example: 'rock' })
  @IsString()
  @IsOptional()
  slug?: string;
}
