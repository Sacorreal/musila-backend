
import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';
import { StorageService } from './storage.service';

@ApiTags('Almacenamiento (Storage)')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) { }

  @Post('upload-url')
  @ApiOperation({
    summary: 'Generar URL prefirmada de subida',
    description: 'Genera una URL de DigitalOcean Spaces para que el cliente pueda subir directamente un archivo.',
  })
  @ApiResponse({ status: 201, description: 'URL prefirmada generada con éxito' })
  @ApiResponse({ status: 400, description: 'Carpeta o tipo de archivo inválidos' })
  async generateUploadUrl(
    @Body() body: GenerateUploadUrlDto,
  ) {
  return this.storageService.generateUploadUrl({
    folder: body.folder,
    fileType: body.fileType,
  });
}  

  @Post('delete-batch') // Usamos POST porque DELETE a veces da problemas recibiendo arrays en el Body
  @ApiOperation({
    summary: 'Eliminar múltiples archivos',
    description: 'Elimina un lote de archivos de DigitalOcean Spaces recibiendo un array de keys (rutas relativas o nombres de objeto).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        keys: {
          type: 'array',
          items: { type: 'string' },
          example: ['tracks/audio/123.mp3', 'users/avatars/456.jpg'],
        },
      },
      required: ['keys'],
    },
  })
  @ApiResponse({ status: 201, description: 'Archivos eliminados exitosamente o batch procesado sin errores' })
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
