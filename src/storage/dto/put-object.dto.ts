import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { FileUpload } from 'graphql-upload-ts';

export class PutObjectDto {
  /**
   * @description Asignar el mismo ID de la entidad (UUID)
   */
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  key!: string;

  @IsNotEmpty()
  file: Promise<FileUpload>;
}
