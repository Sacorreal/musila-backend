import { GuestsService } from './guests.service';
import { CreateGuestInput } from './dto/create-guest.input';
import { RegisterFromInviteDto } from './dto/register-from-invite.dto';
import { UpdateGuestInput } from './dto/update-guest.input';
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { PaginatedGuestsResponseDto } from './dto/guest-pagination.dto';

@ApiTags('Invitados')
@Controller('guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) { }

  // ─── POST /guests/register-from-invite ──────────────────────────────────────
  @Post('register-from-invite')
  @ApiOperation({
    summary: 'Registrar invitado desde invitación',
    description:
      'Registra un nuevo invitado usando un token de invitación válido. No requiere autenticación — el token funciona como autorización.',
  })
  @ApiResponse({ status: 201, description: 'Invitado registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Token ya utilizado o datos inválidos' })
  @ApiResponse({ status: 404, description: 'Token no encontrado' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  @ApiResponse({ status: 410, description: 'Token expirado' })
  async registerFromInviteController(
    @Body() dto: RegisterFromInviteDto,
  ) {
    return await this.guestsService.registerFromInvite(dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Crear nuevo invitado',
    description: 'Crea un nuevo registro de invitado en el sistema.',
  })
  @ApiResponse({
    status: 201,
    description: 'Invitado creado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createGuestController(@Body() createGuestInput: CreateGuestInput) {
    return await this.guestsService.createGuestsService(createGuestInput);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los invitados',
    description: 'Obtiene la lista completa de invitados registrados en el sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de invitados obtenida exitosamente',
    type: PaginatedGuestsResponseDto
  })
  async findAllGuestsController(@Query() paginationDto: PaginationDto) {
    return await this.guestsService.findAllGuestsService(paginationDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un invitado por ID',
    description: 'Obtiene la información detallada de un invitado específico por su ID.',
  })
  @ApiParam({ name: 'id', description: 'ID del invitado (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Información del invitado obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Invitado no encontrado' })
  async findOneGuestController(@Param('id') id: string) {
    return await this.guestsService.findOneGuestsService(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar invitado',
    description: 'Actualiza la información de un invitado existente.',
  })
  @ApiParam({ name: 'id', description: 'ID del invitado a actualizar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Invitado actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Invitado no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updateGuestController(@Body() updateGuestInput: UpdateGuestInput, @Param('id') id: string) {
    return await this.guestsService.updateGuestsService(id, updateGuestInput);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar invitado',
    description: 'Elimina un invitado del sistema por su ID.',
  })
  @ApiParam({ name: 'id', description: 'ID del invitado a eliminar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Invitado eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Invitado no encontrado' })
  async removeGuestController(@Param('id') id: string) {
    return await this.guestsService.removeGuestsService(id);
  }
}
