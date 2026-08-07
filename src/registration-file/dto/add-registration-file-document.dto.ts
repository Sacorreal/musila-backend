import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { RegistrationFileDocumentType } from '../entities/registration-file-document-type.enum';

export class AddRegistrationFileDocumentDto {
  @ApiProperty({ enum: RegistrationFileDocumentType })
  @IsEnum(RegistrationFileDocumentType, { message: 'Tipo documental no válido' })
  documentType: RegistrationFileDocumentType;

  @ApiProperty({ example: 'develop/registration-file/documents/uuid.pdf', description: 'Key ya subido a storage (vía /storage/upload-url)' })
  @IsString()
  @IsNotEmpty({ message: 'El key del archivo es obligatorio' })
  fileKey: string;

  @ApiProperty({ example: 'https://cdn.musila.com/...' })
  @IsString()
  @IsNotEmpty({ message: 'La URL del archivo es obligatoria' })
  fileUrl: string;

  @ApiProperty({ example: 'letra-mi-cancion.pdf' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del archivo es obligatorio' })
  fileName: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @IsNotEmpty({ message: 'El tipo MIME es obligatorio' })
  mimeType: string;

  @ApiProperty({ example: 245678 })
  @IsInt()
  @Min(1)
  fileSizeBytes: number;
}
