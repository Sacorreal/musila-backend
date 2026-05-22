import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {

  constructor(
  ) { }

  @Get()
  @ApiOperation({
    summary: 'Verificar estado de la API',
    description: 'Endpoint para verificar que la API está funcionando correctamente',
  })
  @ApiResponse({
    status: 200,
    description: 'API funcionando correctamente',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        message: { type: 'string', example: 'API is running correctly 🎉' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      },
    },
  })
  getHealth() {



    return {
      status: 'ok',
      message: 'API is running correctly 🎉',
      timestamp: new Date().toISOString(),
    };
  }
}
