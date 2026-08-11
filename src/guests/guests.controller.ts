import { GuestsService } from './guests.service';

import { UpdateGuestInput } from './dto/update-guest.input';
import { RegisterGuestDto } from './dto/register-guest.dto';
import { CreateGuestAdminDto } from './dto/create-guest-admin.dto';
import { GuestFilterDto } from './dto/guest-filter.dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginatedGuestsResponseDto } from './dto/guest-pagination.dto';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

@ApiTags('Invitados')
@Controller('guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) { }

  @Post()
  @RequireCapability('platform.users.guests.manage')
  @UseGuards(JWTAuthGuard, AuthorizationGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Crear invitado directamente (Admin)',
    description: 'Crea un invitado sin pasar por el flujo de invitación por token.',
  })
  @ApiResponse({ status: 201, description: 'Invitado creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  async createGuestByAdminController(@Body() dto: CreateGuestAdminDto) {
    return await this.guestsService.createByAdmin(dto);
  }

  // ─── POST /guests/register-from-invite ─────────────────────────────────────
  @Post('register-from-invite')
  @ApiOperation({
    summary: 'Registrar un nuevo invitado desde un token',
    description: 'Endpoint público. Valida el token, crea el guest y lo marca como usado.',
  })
  @ApiBody({ type: RegisterGuestDto })
  @ApiResponse({ status: 201, description: 'Invitado registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Token ya utilizado' })
  @ApiResponse({ status: 404, description: 'Token no encontrado' })
  @ApiResponse({ status: 409, description: 'El número de documento ya está registrado' })
  @ApiResponse({ status: 410, description: 'Token expirado' })
  async registerFromInviteController(@Body() dto: RegisterGuestDto) {
    return await this.guestsService.registerFromInvite(dto);
  }

  @Get()
  @UseGuards(JWTAuthGuard)
  @ApiOperation({
    summary: 'Obtener todos los invitados',
    description: 'Retorna los invitados del usuario logueado. Si el usuario es ADMIN, retorna todos los invitados del sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de invitados obtenida exitosamente',
    type: PaginatedGuestsResponseDto
  })
  async findAllGuestsController(
    @Query() filterDto: GuestFilterDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return await this.guestsService.findAllGuestsService(filterDto, currentUser);
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
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Actualizar invitado',
    description: 'Actualiza la información de un invitado existente. Solo el usuario que lo invitó o un admin.',
  })
  @ApiParam({ name: 'id', description: 'ID del invitado a actualizar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Invitado actualizado exitosamente',
  })
  @ApiResponse({ status: 403, description: 'No tienes permiso para gestionar este invitado' })
  @ApiResponse({ status: 404, description: 'Invitado no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updateGuestController(
    @Body() updateGuestInput: UpdateGuestInput,
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return await this.guestsService.updateGuestsService(id, updateGuestInput, currentUser);
  }

  @Delete(':id')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Eliminar invitado',
    description: 'Elimina un invitado del sistema por su ID. Solo el usuario que lo invitó o un admin.',
  })
  @ApiParam({ name: 'id', description: 'ID del invitado a eliminar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Invitado eliminado exitosamente',
  })
  @ApiResponse({ status: 403, description: 'No tienes permiso para gestionar este invitado' })
  @ApiResponse({ status: 404, description: 'Invitado no encontrado' })
  async removeGuestController(@Param('id') id: string, @CurrentUser() currentUser: JwtPayload) {
    return await this.guestsService.removeGuestsService(id, currentUser);
  }
}
