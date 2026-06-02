import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { Roles } from 'src/users/decorators/roles.decorator';
import { UserRole } from 'src/users/entities/user-role.enum';
import { RolesGuard } from 'src/users/guards/roles.guard';
import { AddCollaboratorDto } from './dto/add-collaborator.dto';
import { PlaylistCollaboratorsService } from './playlist-collaborators.service';
import { PlanLimit } from 'src/shared/plan-limits/plan-limit.decorator';

@ApiTags('Colaboradores de Playlist')
@UseGuards(JWTAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.AUTOR, UserRole.CANTAUTOR, UserRole.INTERPRETE, UserRole.EDITOR)
@ApiBearerAuth('JWT-auth')
@Controller('playlists/:playlistId/collaborators')
export class PlaylistCollaboratorsController {
  constructor(
    private readonly collaboratorsService: PlaylistCollaboratorsService,
  ) {}

  // ─── POST /playlists/:playlistId/collaborators ─────────────────────────────
  @Post()
  @PlanLimit('collaborators')
  @ApiOperation({
    summary: 'Agregar colaborador a playlist',
    description:
      'Asigna un invitado como colaborador de una playlist con un nivel de permiso específico.',
  })
  @ApiParam({
    name: 'playlistId',
    description: 'ID de la playlist (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 201, description: 'Colaborador agregado exitosamente' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para gestionar esta playlist' })
  @ApiResponse({ status: 404, description: 'Playlist o invitado no encontrado' })
  @ApiResponse({ status: 409, description: 'El invitado ya es colaborador' })
  async addCollaborator(
    @Param('playlistId') playlistId: string,
    @Body() dto: AddCollaboratorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.collaboratorsService.addCollaborator(playlistId, dto, user);
  }

  // ─── POST /playlists/:playlistId/collaborators/bulk ────────────────────────
  @Post('bulk')
  @ApiOperation({
    summary: 'Agregar múltiples colaboradores a playlist',
    description: 'Asigna varios invitados como colaboradores de una playlist con niveles de permiso específicos.',
  })
  @ApiParam({
    name: 'playlistId',
    description: 'ID de la playlist (UUID)',
  })
  @ApiResponse({ status: 201, description: 'Colaboradores agregados exitosamente' })
  async addMultipleCollaborators(
    @Param('playlistId') playlistId: string,
    @Body() dto: import('./dto/add-multiple-collaborators.dto').AddMultipleCollaboratorsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.collaboratorsService.addMultipleCollaborators(playlistId, dto, user);
  }

  // ─── GET /playlists/:playlistId/collaborators ──────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'Obtener colaboradores de una playlist',
    description: 'Lista todos los colaboradores asignados a una playlist.',
  })
  @ApiParam({
    name: 'playlistId',
    description: 'ID de la playlist (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Lista de colaboradores' })
  @ApiResponse({ status: 403, description: 'No tienes permisos' })
  @ApiResponse({ status: 404, description: 'Playlist no encontrada' })
  async getCollaborators(
    @Param('playlistId') playlistId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.collaboratorsService.getCollaborators(playlistId, user);
  }

  // ─── DELETE /playlists/:playlistId/collaborators/:guestId ──────────────────
  @Delete(':guestId')
  @ApiOperation({
    summary: 'Eliminar colaborador de playlist',
    description: 'Remueve un invitado como colaborador de una playlist.',
  })
  @ApiParam({
    name: 'playlistId',
    description: 'ID de la playlist (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'guestId',
    description: 'ID del invitado a remover (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: 'Colaborador eliminado exitosamente' })
  @ApiResponse({ status: 403, description: 'No tienes permisos' })
  @ApiResponse({ status: 404, description: 'Colaborador no encontrado' })
  async removeCollaborator(
    @Param('playlistId') playlistId: string,
    @Param('guestId') guestId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.collaboratorsService.removeCollaborator(playlistId, guestId, user);
  }
}
