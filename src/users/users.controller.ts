import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Query
} from '@nestjs/common';


import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginationDto} from '../common/dto/pagination.dto'
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from 'src/users/decorators/roles.decorator';

import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

import { UserRole } from './entities/user-role.enum';
import { UsersService } from './users.service';
import { JWTAuthGuard} from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from './guards/roles.guard';

@ApiTags('Usuarios')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  
  
  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
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
  async findAllUserController(    
    @Query() paginationDto: PaginationDto
  ) {
    return await this.usersService.findAllUsersService(paginationDto);
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

   @UseGuards(JWTAuthGuard)
  @Get('authors')
  @ApiOperation({
    summary: 'Obtener todos los autores y cantautores',
    description: 'Obtiene la lista de todos los usuarios con rol de autor o cantautor registrados en el sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de autores y cantautores obtenida exitosamente',
  })
  getAuthorsController(
    @Query() paginationDto: PaginationDto
  ) {
    return this.usersService.findAllAuthorsService([UserRole.AUTOR, UserRole.CANTAUTOR],paginationDto);
  }


  // Rutas con parámetros genéricos deben ir AL FINAL


  @UseGuards(JWTAuthGuard)
  @Get('me')
  @ApiOperation({
    summary: 'Obtener el usuario autenticado'
  })  
  @ApiResponse({
    status: 200,
    description: 'Información del usuario obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findOneUserController(
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.usersService.findOneUserService(user.id);
  }

  //TODO: crear ruta Update usuario llamar servicio storage si quiere cambiar avatar

  @UseGuards(JWTAuthGuard)
  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener un usuario por ID',
    description: 'Obtiene la información detallada de un usuario específico por su ID, incluyendo sus relaciones.',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({
    status: 200,
    description: 'Información del usuario obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findUserByIdController(@Param('id', ParseUUIDPipe) id: string) {
    return await this.usersService.findOneUserByIdService(id);
  }

  @UseGuards(JWTAuthGuard)
  @Delete('me/:id')
  @ApiOperation({
    summary: 'Eliminar usuario',
    description: 'Elimina un usuario del sistema por su ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async removeUserController(@CurrentUser() user: JwtPayload,) {
    return await this.usersService.removeUserService(user.id);
  }
}
