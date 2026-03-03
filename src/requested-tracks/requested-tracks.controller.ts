
import { RequestedTracksService } from './requested-tracks.service';
import { CreateRequestedTrackInput } from './dto/create-requested-track.input';
import { UpdateRequestedTrackInput } from './dto/update-requested-track.input';
import { Body, Controller, Delete, Get, Param, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { LicenseType } from './entities/license-type.enum';

@ApiTags('Pistas Solicitadas')
@Controller('requested-tracks')
export class RequestedTracksController {
  constructor(
    private readonly requestedTracksService: RequestedTracksService,
  ) { }


  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Crear solicitud de pista',
    description: 'Crea una nueva solicitud de pista musical con un tipo de licencia específico. Permite subir un archivo opcional.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        requesterId: { type: 'string', format: 'uuid', description: 'ID del usuario que solicita la pista' },
        trackId: { type: 'string', format: 'uuid', description: 'ID de la pista solicitada' },
        licenseType: {
          type: 'string',
          enum: Object.values(LicenseType),
          description: 'Tipo de licencia solicitada'
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo opcional que se sube para el track'
        },
      },
      required: ['requesterId', 'trackId', 'licenseType'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Solicitud de pista creada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Usuario o pista no encontrados' })
   async createRequestedTrackController(@Body() createRequestedTrackInput: CreateRequestedTrackInput) {
    return await this.requestedTracksService.createRequestedTracksService(createRequestedTrackInput);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las solicitudes de pistas',
    description: 'Obtiene la lista completa de solicitudes de pistas musicales en el sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes obtenida exitosamente',
  })
  async findAllRequestedTrackController() {
    return await this.requestedTracksService.findAllRequestedTracksService();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una solicitud de pista por ID',
    description: 'Obtiene la información detallada de una solicitud de pista específica por su ID.',
  })
  @ApiParam({ name: 'id', description: 'ID de la solicitud de pista (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Información de la solicitud obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  async findOneRequestedTrackController(@Param('id') id: string) {
    return await this.requestedTracksService.findOneRequestedTracksService(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar solicitud de pista',
    description: 'Actualiza la información de una solicitud de pista existente, como el estado o el tipo de licencia.',
  })
  @ApiParam({ name: 'id', description: 'ID de la solicitud de pista a actualizar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Solicitud de pista actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updateRequestedTrackController(@Body() updateRequestedTrackInput: UpdateRequestedTrackInput, @Param('id') id: string) {
    return await this.requestedTracksService.updateRequestedTracksService(id, updateRequestedTrackInput);
  }


  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar solicitud de pista',
    description: 'Elimina una solicitud de pista del sistema por su ID.',
  })
  @ApiParam({ name: 'id', description: 'ID de la solicitud de pista a eliminar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Solicitud de pista eliminada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  removeRequestedTrackController(@Param('id') id: string) {
    return this.requestedTracksService.removeRequestedTracksService(id);
  }
}
