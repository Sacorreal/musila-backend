
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';
import { ExternalIdInput } from './external-id.input';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';



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

  @ApiProperty({
    example: 'Rock Progresivo',
    description: 'Subgénero musical de la canción'
  })
  @IsString({ message: 'El subgénero debe ser un texto válido' })
  subGenre: string;

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

  @ApiPropertyOptional({
    example: 1975,
    description: 'Año de lanzamiento de la canción.'
  })
  @IsNumber({}, { message: 'El año debe ser un número' })
  @IsOptional()
  year?: number

  @ApiPropertyOptional({
    example: 'Is this the real life? Is this just fantasy?...',
    description: 'Letra completa de la canción.'
  })
  @IsString({ message: 'La letra debe ser un texto válido' })
  @IsOptional()
  lyric?: string;

  @ApiPropertyOptional({
    example: [
      { type: 'ISRC', value: 'USRC17607839' },
      { type: 'IPI', value: '00012345678' }
    ],
    description:
      `Identificadores externos del track en distintas plataformas o registros oficiales. 
      Cada objeto debe incluir un "type" (ej: ISRC, IPI) y un "value" con el código correspondiente.`
  })
  @IsOptional()
  @IsArray({ message: 'externalsIds debe ser un arreglo de objetos ExternalIdInput' })
  externalsIds?: ExternalIdInput[];

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
  @Transform(({ value }) => typeof value === 'string' ? value.split(',').map(v => v.trim()).filter(Boolean) : [])
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
}
