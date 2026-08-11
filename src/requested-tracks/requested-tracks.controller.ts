
import { RequestedTracksService } from './requested-tracks.service';
import { CreateRequestedTrackInput } from './dto/create-requested-track.input';
import { UpdateRequestedTrackInput } from './dto/update-requested-track.input';
import { SetLicensePriceDto } from './dto/set-license-price.dto';
import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards, UseInterceptors, Query } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { LicenseType } from './entities/license-type.enum';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { PaginationDto} from '../shared/dto/pagination.dto'
import { PaginatedRequestedTracksResponseDto } from './dto/requested-track-pagination.dto';
import { EmailVerifiedGuard } from 'src/users/guards/email-verified.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { ConsumeEntitlement } from 'src/entitlements/decorators/consume-entitlement.decorator';
import { EntitlementConsumeInterceptor } from 'src/entitlements/interceptors/entitlement-consume.interceptor';

@ApiTags('Pistas Solicitadas')
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@Controller('requested-tracks')
export class RequestedTracksController {
  constructor(
    private readonly requestedTracksService: RequestedTracksService,
  ) { }


  @Post()
  @RequireCapability('license.request')
  @ConsumeEntitlement('license.request')
  @UseGuards(EmailVerifiedGuard, AuthorizationGuard)
  @UseInterceptors(EntitlementConsumeInterceptor)
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
   async createRequestedTrackController(@Body() createRequestedTrackInput: CreateRequestedTrackInput, @CurrentUser() userRequester: JwtPayload) {
    return await this.requestedTracksService.createRequestedTracksService(createRequestedTrackInput, userRequester);
  }

  @Get()
  @RequireCapability('license.view')
  @ApiOperation({
    summary: 'Obtener todas las solicitudes de pistas',
    description: 'Obtiene la lista completa de solicitudes de pistas musicales en el sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes obtenida exitosamente',
    type: PaginatedRequestedTracksResponseDto
  })
  async findAllRequestedTrackController(
    @CurrentUser() user: JwtPayload,
    @Query() paginationDto: PaginationDto
  ) {
    return await this.requestedTracksService.findAllRequestedTracksService(user, paginationDto);
  }

  @Get(':id')
  @RequireCapability('license.view')
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
  @RequireCapability('license.manage')
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
  async updateRequestedTrackController(
    @Body() updateRequestedTrackInput: UpdateRequestedTrackInput,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.requestedTracksService.updateRequestedTracksService(id, updateRequestedTrackInput, user.id);
  }


  @Patch(':id/price')
  @RequireCapability('license.manage')
  @ApiOperation({
    summary: 'Establecer precio de licencia',
    description: 'Permite al propietario de la pista establecer el precio de la licencia en COP.',
  })
  @ApiParam({ name: 'id', description: 'ID de la solicitud (UUID)' })
  @ApiResponse({ status: 200, description: 'Precio establecido exitosamente' })
  @ApiResponse({ status: 400, description: 'Solo el propietario puede establecer el precio o la solicitud no está pendiente' })
  async setLicensePriceController(
    @Param('id') id: string,
    @Body() dto: SetLicensePriceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.requestedTracksService.setLicensePrice(id, dto.priceInCOP, user.id);
  }

  @Delete(':id')
  @RequireCapability('license.manage')
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
