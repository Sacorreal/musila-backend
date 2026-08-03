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
import { AllowedPlans } from 'src/users/decorators/allowed-plans.decorator';
import { UpdateUserInput } from './dto/update-user.input';
import { CreateUserInput } from './dto/create-user.input';
import { AdminStatsDto } from './dto/admin-stats.dto';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { ADMIN_PLAN_TYPES, UserPlanType } from './entities/user-plan-type.enum';
import { UsersService } from './users.service';
import { AdminService } from './admin.service';
import { AuditLogService } from './audit-log.service';
import { AuditLogPaginationDto } from './dto/audit-log-pagination.dto';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlansGuard } from './guards/plans.guard';

@ApiTags('Usuarios')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly adminService: AdminService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @AllowedPlans(...ADMIN_PLAN_TYPES)
  @UseGuards(JWTAuthGuard, PlansGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener todos los usuarios (Admin)' })
  @ApiResponse({ status: 200, type: PaginatedUsersResponseDto })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos de administrador' })
  async findAllUserController(@Query() filterDto: FilterUserDto) {
    return await this.usersService.findAllUsersService(filterDto);
  }

  @Get('plan-types')
  @ApiOperation({ summary: 'Obtener tipos de plan disponibles' })
  getPlanTypesController() {
    return this.usersService.getPlanTypesService();
  }

  @Get('music-roles')
  @ApiOperation({ summary: 'Obtener roles musicales disponibles (atributo descriptivo)' })
  getMusicRolesController() {
    return this.usersService.getMusicRolesService();
  }

  @UseGuards(JWTAuthGuard)
  @Get('authors')
  @ApiOperation({ summary: 'Obtener todos los autores y cantautores' })
  @ApiResponse({ status: 200, type: PaginatedUsersResponseDto })
  getAuthorsController(@Query() paginationDto: PaginationDto) {
    return this.usersService.findAllAuthorsService([UserPlanType.PLAN_AUTOR, UserPlanType.PLAN_360], paginationDto);
  }

  @UseGuards(JWTAuthGuard)
  @Get('search/by-creator-id/:musilaCreatorId')
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'musilaCreatorId', description: 'Musila Creator ID del usuario a buscar' })
  @ApiOperation({ summary: 'Buscar un usuario por su Musila Creator ID (para agregar coautores a un split)' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findByMusilaCreatorIdController(@Param('musilaCreatorId') musilaCreatorId: string) {
    const user = await this.usersService.findByMusilaCreatorIdService(musilaCreatorId);
    return {
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      musilaCreatorId: user.musilaCreatorId,
    };
  }

  // ── Admin routes (must be before /:id) ──────────────────────────────

  @Get('admin/stats')
  @AllowedPlans(...ADMIN_PLAN_TYPES)
  @UseGuards(JWTAuthGuard, PlansGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Estadísticas generales del sistema (Admin)' })
  @ApiResponse({ status: 200, type: AdminStatsDto })
  async getAdminStatsController(): Promise<AdminStatsDto> {
    return this.adminService.getStats();
  }

  @Post('admin/create')
  @AllowedPlans(...ADMIN_PLAN_TYPES)
  @UseGuards(JWTAuthGuard, PlansGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear usuario administrador (Admin)' })
  @ApiResponse({ status: 201, description: 'Administrador creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  async createAdminUserController(@Body() dto: CreateUserInput) {
    return this.usersService.createAdminUserService(dto);
  }

  @Get('admin/audit-log')
  @AllowedPlans(...ADMIN_PLAN_TYPES)
  @UseGuards(JWTAuthGuard, PlansGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar registro de auditoría (Admin, solo lectura)' })
  async findAllAuditLogController(@Query() pagination: AuditLogPaginationDto) {
    return this.auditLogService.findAllAdmin(pagination);
  }

  @Delete(':id/hard')
  @AllowedPlans(...ADMIN_PLAN_TYPES)
  @UseGuards(JWTAuthGuard, PlansGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiOperation({
    summary:
      'Eliminar usuario de forma permanente e irreversible junto con toda su data relacionada (Admin)',
  })
  @ApiResponse({ status: 200, description: 'Usuario y su data relacionada eliminados' })
  @ApiResponse({ status: 404, description: 'El usuario no existe' })
  async hardDeleteUserByIdController(@Param('id', ParseUUIDPipe) id: string) {
    return await this.adminService.hardDeleteUserService(id);
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
    return await this.usersService.updateUserService(user.id, updateUserInput, user);
  }

  @UseGuards(JWTAuthGuard)
  @Delete('me')
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
  async findUserByIdController(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.usersService.findOneUserByIdService(id, user.id);
  }

  @AllowedPlans(...ADMIN_PLAN_TYPES)
  @UseGuards(JWTAuthGuard, PlansGuard)
  @Put(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiOperation({ summary: 'Actualizar usuario por ID (Admin)' })
  async updateUserByIdController(
    @Body() updateUserInput: UpdateUserInput,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actingUser: JwtPayload,
  ) {
    return await this.usersService.updateUserService(id, updateUserInput, actingUser);
  }

  @AllowedPlans(...ADMIN_PLAN_TYPES)
  @UseGuards(JWTAuthGuard, PlansGuard)
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiOperation({ summary: 'Eliminar usuario por ID (Admin)' })
  async deleteUserByIdController(@Param('id', ParseUUIDPipe) id: string) {
    return await this.usersService.deleteUserByIdService(id);
  }
}
