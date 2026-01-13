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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

@ApiTags('Pistas Musicales')
@Controller('tracks')
export class TracksController {
  constructor(
    private readonly tracksService: TracksService,
    private readonly usersService: UsersService,
  ) {}

  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateTrackInput })
  @Post()
  @UseInterceptors(FileInterceptor('file_track'))
  @ApiOperation({
    summary: 'Crear nueva pista musical',
    description:
      'Crea una nueva pista musical en el sistema. Requiere subir el archivo de audio de la pista.',
  })
  @ApiResponse({
    status: 201,
    description: 'Pista musical creada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o archivo no proporcionado',
  })
  async createTrackController(
    @Body() createTrackInput: CreateTrackInput,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.tracksService.createTrackService(createTrackInput, file);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las pistas musicales',
    description:
      'Obtiene la lista de pistas musicales con opciones de filtrado por género, autor, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de pistas musicales obtenida exitosamente',
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
    summary: 'Obtener mis pistas musicales',
    description:
      'Obtiene todas las pistas musicales creadas por el usuario autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de pistas del usuario obtenida exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findMyTracksController(@CurrentUser() user: JwtPayload) {
    return this.tracksService.findAllTracksService({ user });
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('by-preferred-genres')
  @ApiOperation({
    summary: 'Obtener pistas por géneros preferidos',
    description:
      'Obtiene pistas musicales basadas en los géneros musicales preferidos del usuario autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de pistas por géneros preferidos obtenida exitosamente',
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
    summary: 'Obtener una pista musical por ID',
    description:
      'Obtiene la información detallada de una pista musical específica por su ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la pista musical (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Información de la pista obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Pista musical no encontrada' })
  async findOneTrackController(@Param('id') id: string) {
    return await this.tracksService.findOneTrackService(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar pista musical',
    description: 'Actualiza la información de una pista musical existente.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la pista musical a actualizar (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Pista musical actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Pista musical no encontrada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updateTrackController(
    @Body() updateTrackInput: UpdateTrackInput,
    @Param('id') id: string,
  ) {
    return await this.tracksService.updateTrackService(id, updateTrackInput);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar pista musical',
    description: 'Elimina una pista musical del sistema por su ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la pista musical a eliminar (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Pista musical eliminada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Pista musical no encontrada' })
  async removeTrackController(@Param('id') id: string) {
    return await this.tracksService.removeTrackService(id);
  }
}
