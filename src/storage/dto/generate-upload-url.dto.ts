import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StorageFolder } from '../dto/storage-folder.enum';

export class GenerateUploadUrlDto {
  @ApiProperty({
    description: 'Carpeta de destino en DigitalOcean Spaces',
    enum: StorageFolder,
    example: StorageFolder.TRACK_AUDIO,
  })
  @IsEnum(StorageFolder, {
    message: 'Invalid storage folder',
  })
  folder: StorageFolder;

  @ApiProperty({
    description: 'MIME type del archivo a subir',
    example: 'audio/mp3',
  })
  @IsString()
  fileType: string;
}