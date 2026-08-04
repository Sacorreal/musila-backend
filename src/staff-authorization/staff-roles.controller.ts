import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PlansGuard } from 'src/users/guards/plans.guard';
import { AllowedPlans } from 'src/users/decorators/allowed-plans.decorator';
import { ADMIN_PLAN_TYPES } from 'src/users/entities/user-plan-type.enum';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { StaffAuditInterceptor } from 'src/staff-audit/interceptors/staff-audit.interceptor';
import { AuditAction } from 'src/staff-audit/decorators/audit-action.decorator';
import { RequireStaffPermission } from './decorators/require-staff-permission.decorator';
import { StaffPermissionGuard } from './guards/staff-permission.guard';
import { StaffRolesService } from './staff-roles.service';
import { CreateStaffRoleDto } from './dto/create-staff-role.dto';
import { UpdateStaffRoleDto } from './dto/update-staff-role.dto';
import { StaffRolePaginationDto } from './dto/staff-role-pagination.dto';

@ApiTags('Staff · Roles')
@ApiBearerAuth('JWT-auth')
@AllowedPlans(...ADMIN_PLAN_TYPES)
@UseGuards(JWTAuthGuard, PlansGuard, StaffPermissionGuard)
@UseInterceptors(StaffAuditInterceptor)
@Controller('staff/roles')
export class StaffRolesController {
  constructor(private readonly staffRolesService: StaffRolesService) {}

  @Get()
  @RequireStaffPermission('system:roles:view', 'system:staff:view')
  @ApiOperation({ summary: 'Listar roles internos (base + personalizados)' })
  findAll(@Query() pagination: StaffRolePaginationDto) {
    return this.staffRolesService.findAll(pagination);
  }

  @Get(':id')
  @RequireStaffPermission('system:roles:view', 'system:staff:view')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Obtener el detalle de un rol interno, con sus permisos' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffRolesService.findOne(id);
  }

  @Post()
  @RequireStaffPermission('system:roles:manage')
  @AuditAction('staff-roles:create')
  @ApiOperation({ summary: 'Crear un rol interno personalizado (Flow 3)' })
  create(@Body() dto: CreateStaffRoleDto, @CurrentUser() user: JwtPayload) {
    return this.staffRolesService.create(dto, user.id);
  }

  @Patch(':id')
  @RequireStaffPermission('system:roles:manage')
  @AuditAction('staff-roles:update')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Editar nombre, descripción o permisos de un rol interno' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStaffRoleDto) {
    return this.staffRolesService.update(id, dto);
  }

  @Delete(':id')
  @RequireStaffPermission('system:roles:manage')
  @AuditAction('staff-roles:delete')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Eliminar un rol interno personalizado sin miembros asignados' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffRolesService.remove(id);
  }
}
