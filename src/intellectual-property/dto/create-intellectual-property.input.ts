import { IsNotEmpty, IsString, IsUUID, IsUrl } from 'class-validator';

export class CreateIntellectualPropertyInput {
  @IsString({ message: 'El título debe ser un texto válido' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title: string;

  @IsUUID('4', { message: 'El trackId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El trackId es obligatorio' })
  trackId: string;

  @IsString({ message: 'La URL del documento debe ser un texto válido' })
  @IsUrl({}, { message: 'El documentUrl debe ser una URL válida' })
  @IsNotEmpty({ message: 'El documentUrl es obligatorio' })
  documentUrl: string;
}
