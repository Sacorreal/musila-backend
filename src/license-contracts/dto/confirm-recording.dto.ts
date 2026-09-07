import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmRecordingDto {
  @ApiProperty({ example: 'US-ABC-27-00001', description: 'ISRC asignado a la grabación' })
  @IsString({ message: 'El ISRC debe ser un texto válido' })
  @IsNotEmpty({ message: 'El ISRC es obligatorio' })
  @MaxLength(15, { message: 'El ISRC no puede superar 15 caracteres' })
  isrc: string;

  @ApiProperty({
    required: false,
    example: '0885150000000',
    description: 'UPC/EAN del lanzamiento. Opcional para sencillos sin álbum',
  })
  @IsOptional()
  @IsString({ message: 'El UPC debe ser un texto válido' })
  @MaxLength(20, { message: 'El UPC no puede superar 20 caracteres' })
  upc?: string;

  @ApiProperty({ example: 'Karol G', description: 'Nombre del artista principal de la grabación' })
  @IsString({ message: 'El nombre del artista principal debe ser un texto válido' })
  @IsNotEmpty({ message: 'El nombre del artista principal es obligatorio' })
  @MaxLength(255, { message: 'El nombre del artista principal no puede superar 255 caracteres' })
  mainArtistName: string;

  @ApiProperty({ example: 'Mañana Será Bonito', description: 'Nombre del álbum, EP o sencillo' })
  @IsString({ message: 'El nombre del álbum o EP debe ser un texto válido' })
  @IsNotEmpty({ message: 'El nombre del álbum o EP es obligatorio' })
  @MaxLength(255, { message: 'El nombre del álbum o EP no puede superar 255 caracteres' })
  albumOrEpName: string;

  @ApiProperty({ example: '2026-08-12', description: 'Fecha de lanzamiento (ISO 8601)' })
  @IsDateString({}, { message: 'La fecha de lanzamiento debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de lanzamiento es obligatoria' })
  releaseDate: string;
}
