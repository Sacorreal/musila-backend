import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsUrl } from 'class-validator';

export class CreateIntellectualPropertyInput {

  @ApiProperty({ example: '' , description: '' })  
  @IsString({ message: 'El título debe ser un texto válido' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title: string;

  @ApiProperty({ example: '' , description: '' })
  @IsUUID('4', { message: 'El trackId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El trackId es obligatorio' })
  trackId: string;

  @ApiProperty({ example: '' , description: '' })  
  @IsString({ message: 'La URL del documento debe ser un texto válido' })
  @IsUrl({}, { message: 'El documentUrl debe ser una URL válida' })
  @IsNotEmpty({ message: 'El documentUrl es obligatorio' })
  documentUrl: string;
}
