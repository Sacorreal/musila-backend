import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { CreatePlaylistInput } from './dto/create-playlist.input';
import { UpdatePlaylistInput } from './dto/update-playlist.input';
import { PlaylistsService } from './playlists.service';

@ApiTags('Listas de Reproducción')
@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Post()
  
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Crear nueva lista de reproducción',
    description: 'Crea una nueva lista de reproducción para el usuario autenticado.',
  })
  @ApiResponse({
    status: 201,
    description: 'Lista de reproducción creada exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createPlaylistsController(
    @Body() createPlaylistInput: CreatePlaylistInput,
  ) {
    return await this.playlistsService.createPlaylistsService(
      createPlaylistInput,
    );
  }

  @Get()
 
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener todas las listas de reproducción',
    description: 'Obtiene todas las listas de reproducción del usuario autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de reproducciones obtenida exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAllPlaylistsController(@CurrentUser() user: JwtPayload) {
    return await this.playlistsService.findAllPlaylistsService(user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una lista de reproducción por ID',
    description: 'Obtiene la información detallada de una lista de reproducción específica por su ID.',
  })
  @ApiParam({ name: 'id', description: 'ID de la lista de reproducción (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Información de la lista de reproducción obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Lista de reproducción no encontrada' })
  async findOnePlaylistsController(@Param('id') id: string) {
    return await this.playlistsService.findOnePlaylistsService(id);
  }

  @Put(':id')
  
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Actualizar lista de reproducción',
    description: 'Actualiza la información de una lista de reproducción existente.',
  })
  @ApiParam({ name: 'id', description: 'ID de la lista de reproducción a actualizar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Lista de reproducción actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Lista de reproducción no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updatePlaylistsController(
    @Body() updatePlaylistInput: UpdatePlaylistInput,
    @Param('id') id: string,
  ) {
    return await this.playlistsService.updatePlaylistsService(
      id,
      updatePlaylistInput,
    );
  }

  @Delete(':id')
  
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Eliminar lista de reproducción',
    description: 'Elimina una lista de reproducción del sistema por su ID.',
  })
  @ApiParam({ name: 'id', description: 'ID de la lista de reproducción a eliminar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Lista de reproducción eliminada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Lista de reproducción no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async removePlaylistsController(@Param('id') id: string) {
    return await this.playlistsService.removePlaylistsService(id);
  }
}
