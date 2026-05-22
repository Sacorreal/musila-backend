import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PaginationDto } from '../shared/dto/pagination.dto';
import { FilterUserDto } from './dto/filter-user.dto';
import { PaginatedUsersResponseDto } from './dto/user-pagination.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from 'src/users/decorators/roles.decorator';
import { UpdateUserInput } from './dto/update-user.input';
import { CreateUserInput } from './dto/create-user.input';
import { AdminStatsDto } from './dto/admin-stats.dto';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UserRole } from './entities/user-role.enum';
import { UsersService } from './users.service';
import { AdminService } from './admin.service';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@ApiTags('Usuarios')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly adminService: AdminService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener todos los usuarios (Admin)' })
  @ApiResponse({ status: 200, type: PaginatedUsersResponseDto })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos de administrador' })
  async findAllUserController(@Query() filterDto: FilterUserDto) {
    return await this.usersService.findAllUsersService(filterDto);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Obtener roles disponibles' })
  getUserRolesController() {
    return this.usersService.getUserRolesService();
  }

  @UseGuards(JWTAuthGuard)
  @Get('authors')
  @ApiOperation({ summary: 'Obtener todos los autores y cantautores' })
  @ApiResponse({ status: 200, type: PaginatedUsersResponseDto })
  getAuthorsController(@Query() paginationDto: PaginationDto) {
    return this.usersService.findAllAuthorsService([UserRole.AUTOR, UserRole.CANTAUTOR], paginationDto);
  }

  // ── Admin routes (must be before /:id) ──────────────────────────────

  @Get('admin/stats')
  @Roles(UserRole.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Estadísticas generales del sistema (Admin)' })
  @ApiResponse({ status: 200, type: AdminStatsDto })
  async getAdminStatsController(): Promise<AdminStatsDto> {
    return this.adminService.getStats();
  }

  @Post('admin/create')
  @Roles(UserRole.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear usuario administrador (Admin)' })
  @ApiResponse({ status: 201, description: 'Administrador creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  async createAdminUserController(@Body() dto: CreateUserInput) {
    return this.usersService.createAdminUserService(dto);
  }

  // ── Authenticated user self-routes ───────────────────────────────────

  @UseGuards(JWTAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Obtener el usuario autenticado' })
  async findOneUserController(@CurrentUser() user: JwtPayload) {
    return await this.usersService.findOneUserService(user.id);
  }

  @UseGuards(JWTAuthGuard)
  @Put('me')
  @ApiOperation({ summary: 'Actualizar perfil del usuario autenticado' })
  async updateMyProfileController(
    @CurrentUser() user: JwtPayload,
    @Body() updateUserInput: UpdateUserInput,
  ) {
    return await this.usersService.updateUserService(user.id, updateUserInput);
  }

  @UseGuards(JWTAuthGuard)
  @Delete('me/:id')
  @ApiOperation({ summary: 'Eliminar cuenta propia' })
  async removeUserController(@CurrentUser() user: JwtPayload) {
    return await this.usersService.removeUserService(user.id);
  }

  // ── Generic /:id routes (must be last) ──────────────────────────────

  @UseGuards(JWTAuthGuard)
  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  async findUserByIdController(@Param('id', ParseUUIDPipe) id: string) {
    return await this.usersService.findOneUserByIdService(id);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Put(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiOperation({ summary: 'Actualizar usuario por ID (Admin)' })
  async updateUserByIdController(
    @Body() updateUserInput: UpdateUserInput,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.usersService.updateUserService(id, updateUserInput);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiOperation({ summary: 'Eliminar usuario por ID (Admin)' })
  async deleteUserByIdController(@Param('id', ParseUUIDPipe) id: string) {
    return await this.usersService.deleteUserByIdService(id);
  }
}
