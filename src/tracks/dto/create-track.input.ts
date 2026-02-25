
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ExternalIdInput } from './external-id.input';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';



export class CreateTrackInput {

  @ApiProperty({
    example: 'Bohemian Rhapsody',
    description: 'Título de la canción o track.'
  })
  @IsString({ message: 'El título debe ser un texto válido' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Identificador único (UUID v4) del género musical asociado al track.'
  })
  @IsUUID('4', { message: 'El genreId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El genreId es obligatorio' })
  genreId: string;

  @ApiPropertyOptional({
    example: 'Rock Progresivo',
    description: 'Subgénero musical de la canción'
  })
  @IsString({ message: 'El subgénero debe ser un texto válido' })
  @IsOptional()
  subGenre?: string;

  @ApiPropertyOptional({
    example: 'https://ejemplo.com/imagenes/bohemian-rhapsody.jpg',
    description: 'URL de la imagen de portada del track (opcional).'
  })
  @IsOptional()
  @IsString({ message: 'La portada debe ser un texto válido (URL esperada)' })
  @IsUrl({}, { message: 'La portada debe ser una URL válida' })
  cover?: string;

  @ApiProperty({
    example: 'Inglés',
    description: 'Idioma principal de la canción.'
  })
  @IsString({ message: 'El idioma debe ser un texto válido' })
  @IsNotEmpty({ message: 'El idioma es obligatorio' })
  language: string; 

  @ApiProperty({
    example: 'Is this the real life? Is this just fantasy?...',
    description: 'Letra completa de la canción.'
  })
  @IsString({ message: 'La letra debe ser un texto válido' }) 
  lyric: string; 

  @ApiProperty({
    type: [String],
    example: [
      '660e8400-e29b-41d4-a716-446655440000',
      '770e8400-e29b-41d4-a716-446655440000'
    ],
    description: 'Lista de identificadores únicos (UUID v4) de los autores del track.'
  })
  @IsArray({ message: 'authorsIds debe ser un arreglo de UUIDs' })
  @IsUUID('4', {
    each: true,
    message: 'Cada authorId debe ser un UUID v4 válido',
  })
  @IsNotEmpty({ message: 'authorsIds no puede estar vacío' })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean);
    return [];
  })
  authorsIds: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Indica si el track está disponible en el sistema (opcional).'
  })
  @IsOptional()
  @IsBoolean({ message: 'isAvailable debe ser un valor booleano' })
  isAvailable?: boolean;

  @ApiProperty({
    example: false,
    description: 'Indica si el track pertenece al género Gospel.'
  })
  @IsBoolean({ message: 'isGospel debe ser un valor booleano' })
  isGospel: boolean;

@IsNotEmpty({ message: 'audioKey no puede estar vacío' })
  audioKey: string

@IsNotEmpty({ message: 'audioUrl no puede estar vacío' })  
audioUrl: string

@IsOptional()
coverKey?: string

@IsOptional()
coverUrl?: string

  @ApiPropertyOptional({
    type: [ExternalIdInput],
    description:
      'Identificadores externos del track (por ejemplo, IDs de Spotify, Apple Music, etc.).',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExternalIdInput)
  externalsIds?: ExternalIdInput[];


}
