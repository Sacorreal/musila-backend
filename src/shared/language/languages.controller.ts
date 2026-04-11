import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LanguagesService } from './languages.service';

@ApiTags('Idiomas')
@Controller('languages')
export class LanguagesController {
  constructor(private readonly service: LanguagesService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los idiomas disponibles',
    description: 'Obtiene la lista completa de idiomas disponibles en el sistema, basados en el estándar ISO 639-1.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de idiomas obtenida exitosamente',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'es' },
          name: { type: 'string', example: 'Español' },
          nativeName: { type: 'string', example: 'Español' },
        },
      },
    },
  })
  getLanguages() {
    return this.service.getAllLanguages();
  }
}
