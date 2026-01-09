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
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthRolesGuard } from 'src/auth/guards/jwt-auth-roles.guard';
import { UserRole } from 'src/users/entities/user-role.enum';
import { CreateMusicalGenreInput } from './dto/create-musical-genre.input';
import { UpdateMusicalGenreInput } from './dto/update-musical-genre.input';
import { MusicalGenreService } from './musical-genre.service';

@ApiTags('Géneros Musicales')
@Controller('musical-genre')
export class MusicalGenreController {
  constructor(private readonly musicalGenreService: MusicalGenreService) {}

  @UseGuards(JwtAuthRolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({
    summary: 'Crear nuevo género musical',
    description: 'Crea un nuevo género musical en el sistema. Requiere rol de administrador.',
  })
  @ApiResponse({
    status: 201,
    description: 'Género musical creado exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos de administrador' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createMusicalGenreController(
    @Body() createMusicalGenreInput: CreateMusicalGenreInput,
  ) {
    return await this.musicalGenreService.createMusicalGenreService(
      createMusicalGenreInput,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los géneros musicales',
    description: 'Obtiene la lista completa de géneros musicales disponibles en el sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de géneros musicales obtenida exitosamente',
  })
  async findAllMusicalGenreController() {
    return await this.musicalGenreService.findAllMusicalGenreService();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un género musical por ID',
    description: 'Obtiene la información detallada de un género musical específico por su ID.',
  })
  @ApiParam({ name: 'id', description: 'ID del género musical (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Información del género musical obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Género musical no encontrado' })
  async findOneMusicalGenreController(@Param('id') id: string) {
    return await this.musicalGenreService.findOneMusicalGenreService(id);
  }

  @UseGuards(JwtAuthRolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar género musical',
    description: 'Actualiza la información de un género musical existente. Requiere rol de administrador.',
  })
  @ApiParam({ name: 'id', description: 'ID del género musical a actualizar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Género musical actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Género musical no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos de administrador' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updateMusicalGenreController(
    @Body() updateMusicalGenreInput: UpdateMusicalGenreInput,
    @Param('id') id: string,
  ) {
    return await this.musicalGenreService.updateMusicalGenreService(
      id,
      updateMusicalGenreInput,
    );
  }

  @UseGuards(JwtAuthRolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar género musical',
    description: 'Elimina un género musical del sistema por su ID. Requiere rol de administrador.',
  })
  @ApiParam({ name: 'id', description: 'ID del género musical a eliminar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Género musical eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Género musical no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos de administrador' })
  async removeMusicalGenreController(@Param('id') id: string) {
    return await this.musicalGenreService.removeMusicalGenreService(id);
  }
}
