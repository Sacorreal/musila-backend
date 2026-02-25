import { IsEnum, IsString } from 'class-validator';
import { StorageFolder } from '../dto/storage-folder.enum';

export class GenerateUploadUrlDto {
  @IsEnum(StorageFolder, {
    message: 'Invalid storage folder',
  })
  folder: StorageFolder;

  @IsString()
  fileType: string;
}