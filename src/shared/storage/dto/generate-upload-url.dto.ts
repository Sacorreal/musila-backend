import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StorageFolder } from '../dto/storage-folder.enum';

export class GenerateUploadUrlDto {
  @ApiProperty({
    description: 'Carpeta de destino en DigitalOcean Spaces',
    example: 'chat/some-id/documents',
  })
  @IsString()
  folder: string;

  @ApiProperty({
    description: 'MIME type del archivo a subir',
    example: 'audio/mp3',
  })
  @IsString()
  fileType: string;
}