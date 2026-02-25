import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FilterTrackDto } from './dto/filter-track.dto';

import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UsersService } from 'src/users/users.service';
import { CreateTrackInput } from './dto/create-track.input';
import { UpdateTrackInput } from './dto/update-track.input';
import { TracksService } from './tracks.service';

@ApiTags('Tracks')
@Controller('tracks')
export class TracksController {
  constructor(
    private readonly tracksService: TracksService,
    private readonly usersService: UsersService,
  ) {}

  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateTrackInput })
  @Post()
    @ApiOperation({
    summary: 'Crear nuevo track',
    description:
      'Crea un nuevo track en el sistema. Requiere subir el archivo de audio del track.',
  })
  @ApiResponse({
    status: 201,
    description: 'Track creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  async createTrackController(
    @Body() createTrackInput: CreateTrackInput,    
  ) {
    return await this.tracksService.createTrackService(createTrackInput);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los tracks',
    description:
      'Obtiene la lista de tracks con opciones de filtrado por género, autor, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tracks obtenida exitosamente',
  })
  async findAllTracksController(
    //@CurrentUser() user: JwtPayload,
    @Query() params: FilterTrackDto,
  ) {
    return await this.tracksService.findAllTracksService({ params });
  }

  @Get('my-tracks')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener mis tracks',
    description:
      'Obtiene todas los tracks creados por el usuario autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tracks del usuario obtenida exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findMyTracksController(@CurrentUser() user: JwtPayload) {
    return this.tracksService.findAllTracksService({ user });
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('by-preferred-genres')
  @ApiOperation({
    summary: 'Obtener tracks por géneros preferidos',
    description:
      'Obtiene tracks basados en los géneros musicales preferidos del usuario autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tracks por géneros preferidos obtenida exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getTracksByPreferredGenresController(
    @CurrentUser() payload: JwtPayload,
  ) {
    const user = await this.usersService.findOneUserService(payload.id);

    return this.tracksService.findTracksByUserPreferredGenresService(user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un track por ID',
    description:
      'Obtiene la información detallada de un track específico por su ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del track (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Información del track obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Pista musical no encontrada' })
  async findOneTrackController(@Param('id') id: string) {
    return await this.tracksService.findOneTrackService(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar track',
    description: 'Actualiza la información de un track existente.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del track a actualizar (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Track actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Track no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updateTrackController(
    @Body() updateTrackInput: UpdateTrackInput,
    @Param('id') id: string,
  ) {
    return await this.tracksService.updateTrackService(id, updateTrackInput);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar track',
    description: 'Elimina un track del sistema por su ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del track a eliminar (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Track eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Track no encontrado' })
  async removeTrackController(@Param('id') id: string) {
    return await this.tracksService.removeTrackService(id);
  }
}
