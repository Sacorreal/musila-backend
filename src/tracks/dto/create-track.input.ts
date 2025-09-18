
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


export class CreateTrackInput {
  @IsString({ message: 'El título debe ser un texto válido' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title: string;

  @IsUUID('4', { message: 'El genreId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El genreId es obligatorio' })
  genreId: string;

  @IsOptional()
  @IsString({ message: 'El subgénero debe ser un texto válido' })
  subGenre?: string;

  @IsOptional()
  @IsString({ message: 'La portada debe ser un texto válido (URL esperada)' })
  @IsUrl({}, { message: 'La portada debe ser una URL válida' })
  cover?: string;

  @IsString({ message: 'La URL debe ser un texto válido' })
  @IsUrl({}, { message: 'La URL de la canción debe ser válida' })
  @IsNotEmpty({ message: 'La URL es obligatoria' })
  url: string;

  @IsString({ message: 'El idioma debe ser un texto válido' })
  @IsNotEmpty({ message: 'El idioma es obligatorio' })
  language: string;

  @IsNotEmpty({ message: 'El año es obligatorio' })
  @IsNumber({}, { message: 'El año debe ser un número' })
  year: number
  
  @IsString({ message: 'La letra debe ser un texto válido' })
  @IsNotEmpty({ message: 'La letra es obligatoria' })
  lyric: string;

  @IsOptional()
  @IsArray({ message: 'externalsIds debe ser un arreglo de strings' })
  externalsIds?: ExternalIdInput[];

  @IsArray({ message: 'authorsIds debe ser un arreglo de UUIDs' })
  @IsUUID('4', {
    each: true,
    message: 'Cada authorId debe ser un UUID v4 válido',
  })
  @IsNotEmpty({ message: 'authorsIds no puede estar vacío' })
  authorsIds: string[];

  @IsOptional()
  @IsBoolean({ message: 'isAvailable debe ser un valor booleano' })
  isAvailable?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'isGospel debe ser un valor booleano' })
  isGospel?: boolean;
}
