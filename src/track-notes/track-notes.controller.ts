import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { CreateTrackNoteDto } from './dto/create-track-note.dto';
import { FindTrackNotesDto } from './dto/find-track-notes.dto';
import { TrackNoteResponseDto } from './dto/track-note-response.dto';
import { UpdateTrackNoteDto } from './dto/update-track-note.dto';
import { TrackNotesService } from './track-notes.service';

// Sin @RequireCapability a nivel de ruta: la visibilidad (privada vs. de
// playlist compartida) depende de datos del body/query, no solo del usuario,
// así que la autorización condicional vive en TrackNotesService.
@ApiTags('Notas de Tracks')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@Controller('track-notes')
export class TrackNotesController {
  constructor(private readonly trackNotesService: TrackNotesService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear una nota sobre un track',
    description:
      'Sin playlistId la nota es privada (requiere la capability marketplace.search). Con playlistId, visible para todos los miembros de esa playlist (sin exigir capability de plataforma).',
  })
  @ApiResponse({ status: 201, description: 'Nota creada exitosamente' })
  @ApiResponse({ status: 400, description: 'El track no pertenece a la playlist indicada' })
  @ApiResponse({ status: 403, description: 'Sin acceso para anotar este track' })
  @ApiResponse({ status: 404, description: 'Track o playlist no encontrados' })
  async create(
    @Body() dto: CreateTrackNoteDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TrackNoteResponseDto> {
    return this.trackNotesService.create(dto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar notas de un track',
    description:
      'Con playlistId retorna las notas de todos los miembros de esa playlist; sin playlistId retorna solo las notas privadas del usuario autenticado.',
  })
  @ApiResponse({ status: 200, description: 'Lista de notas obtenida exitosamente' })
  @ApiResponse({ status: 403, description: 'Sin acceso para ver las notas de este track' })
  @ApiResponse({ status: 404, description: 'Playlist no encontrada' })
  async findAll(
    @Query() query: FindTrackNotesDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TrackNoteResponseDto[]> {
    return this.trackNotesService.findAllByTrack(query.trackId, query.playlistId, user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar una nota',
    description: 'Solo el autor de la nota puede editarla.',
  })
  @ApiParam({ name: 'id', description: 'ID de la nota (UUID)' })
  @ApiResponse({ status: 200, description: 'Nota actualizada exitosamente' })
  @ApiResponse({ status: 403, description: 'Solo el autor puede editar la nota' })
  @ApiResponse({ status: 404, description: 'Nota no encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrackNoteDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TrackNoteResponseDto> {
    return this.trackNotesService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Eliminar una nota',
    description: 'Solo el autor de la nota puede eliminarla (soft delete).',
  })
  @ApiParam({ name: 'id', description: 'ID de la nota (UUID)' })
  @ApiResponse({ status: 204, description: 'Nota eliminada exitosamente' })
  @ApiResponse({ status: 403, description: 'Solo el autor puede eliminar la nota' })
  @ApiResponse({ status: 404, description: 'Nota no encontrada' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.trackNotesService.remove(id, user);
  }
}
