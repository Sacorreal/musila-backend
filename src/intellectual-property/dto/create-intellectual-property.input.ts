import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsUrl } from 'class-validator';

export class CreateIntellectualPropertyInput {

  @ApiProperty({ example: 'Registro Copyright 2026', description: 'Título del documento o de la propiedad intelectual' })  
  @IsString({ message: 'El título debe ser un texto válido' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'UUID de la pista musical' })
  @IsUUID('4', { message: 'El trackId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El trackId es obligatorio' })
  trackId: string;

  @ApiProperty({ example: 'https://cdn.musila.com/docs/123.pdf', description: 'URL pública del documento probatorio' })  
  @IsString({ message: 'La URL del documento debe ser un texto válido' })
  @IsUrl({}, { message: 'El documentUrl debe ser una URL válida' })
  @IsNotEmpty({ message: 'El documentUrl es obligatorio' })
  documentUrl: string;
}
