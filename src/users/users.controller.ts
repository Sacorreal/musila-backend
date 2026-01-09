import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthRolesGuard } from 'src/auth/guards/jwt-auth-roles.guard';
import { AuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UpdateUserInput } from './dto/update-user.input';
import { UserRole } from './entities/user-role.enum';
import { UsersService } from './users.service';

@ApiTags('Usuarios')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthRolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener todos los usuarios',
    description: 'Obtiene la lista completa de usuarios registrados en el sistema. Requiere rol de administrador.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios obtenida exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos de administrador' })
  async findAllUserController() {
    return await this.usersService.findAllUsersService();
  }

  // Rutas específicas deben ir ANTES de las rutas con parámetros genéricos
  @Get('roles')
  @ApiOperation({
    summary: 'Obtener roles disponibles',
    description: 'Retorna la lista de roles de usuario disponibles en el sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de roles obtenida exitosamente',
  })
  getUserRolesController() {
    return this.usersService.getUserRolesService();
  }

  @Get('authors')
  @ApiOperation({
    summary: 'Obtener todos los autores',
    description: 'Obtiene la lista de todos los usuarios con rol de autor registrados en el sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de autores obtenida exitosamente',
  })
  getAuthorsController() {
    return this.usersService.findAllAuthorsService(UserRole.AUTOR);
  }

  @Get('author/:id')
  @ApiOperation({
    summary: 'Obtener un autor por ID',
    description: 'Obtiene la información detallada de un autor específico por su ID.',
  })
  @ApiParam({ name: 'id', description: 'ID del autor (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Información del autor obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Autor no encontrado' })
  async findOneAuthorController(@Param('id') id: string) {
    return await this.usersService.findOneAuthorService(id);
  }

  // Rutas con parámetros genéricos deben ir AL FINAL
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get(':id/featured-authors')
  @ApiOperation({
    summary: 'Obtener autores destacados por géneros preferidos',
    description: 'Obtiene una lista de autores destacados basados en los géneros musicales preferidos del usuario autenticado.',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Lista de autores destacados obtenida exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findFeaturedAuthorsController(@CurrentUser() payload: JwtPayload) {
    return await this.usersService.getFeaturedAuthorsByPreferredGenresService(
      payload.id,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un usuario por ID',
    description: 'Obtiene la información detallada de un usuario específico por su ID.',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Información del usuario obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findOneUserController(@Param('id') id: string) {
    return await this.usersService.findOneUserService(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Actualizar usuario',
    description: 'Actualiza la información de un usuario existente. Permite subir un archivo de imagen opcional.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateUserInput })
  @ApiParam({ name: 'id', description: 'ID del usuario a actualizar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updateUserController(
    @Body() updateUserInput: UpdateUserInput,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.usersService.updateUserService(id, updateUserInput, file);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar usuario',
    description: 'Elimina un usuario del sistema por su ID.',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario a eliminar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Usuario eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async removeUserController(@Param('id') id: string) {
    return await this.usersService.removeUserService(id);
  }
}
