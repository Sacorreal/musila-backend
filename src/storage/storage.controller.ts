
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { GenerateUploadUrlDto} from './dto/generate-upload-url.dto'
import { StorageService } from './storage.service';


@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) { }

  @Post('upload-url')
async generateUploadUrl(
  @Body() body: GenerateUploadUrlDto,
) {
  return this.storageService.generateUploadUrl({
    folder: body.folder,
    fileType: body.fileType,
  });
}  
}
