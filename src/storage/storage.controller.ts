
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

@Post('delete-batch') // Usamos POST porque DELETE a veces da problemas recibiendo arrays en el Body
  async deleteFilesBatch(@Body() body: { keys: string[] }) {
    if (!body.keys || !body.keys.length) {
      return { success: true, message: 'No keys provided' };
    }

    const deletePromises = body.keys.map((key) => 
      this.storageService.deleteObject(key)
    );

    await Promise.all(deletePromises);

    return { success: true, message: 'Files deleted successfully' };
  }
}
