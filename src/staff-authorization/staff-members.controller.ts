import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { StepUpGuard } from 'src/auth/guards/step-up.guard';
import { RequireStepUp } from 'src/auth/decorators/require-step-up.decorator';
import { PlansGuard } from 'src/users/guards/plans.guard';
import { AllowedPlans } from 'src/users/decorators/allowed-plans.decorator';
import { ADMIN_PLAN_TYPES } from 'src/users/entities/user-plan-type.enum';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { StaffAuditInterceptor } from 'src/staff-audit/interceptors/staff-audit.interceptor';
import { AuditAction } from 'src/staff-audit/decorators/audit-action.decorator';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { StaffMembersService } from './staff-members.service';
import { InviteStaffMemberDto } from './dto/invite-staff-member.dto';
import { AssignStaffRoleDto } from './dto/assign-staff-role.dto';
import { StaffMemberPaginationDto } from './dto/staff-member-pagination.dto';

@ApiTags('Staff · Equipo')
@ApiBearerAuth('JWT-auth')
@AllowedPlans(...ADMIN_PLAN_TYPES)
@UseGuards(JWTAuthGuard, PlansGuard)
@UseInterceptors(StaffAuditInterceptor)
@Controller('staff/members')
export class StaffMembersController {
  constructor(private readonly staffMembersService: StaffMembersService) {}

  /** Sin StaffPermissionGuard: cualquier miembro del staff puede consultar sus propios permisos (para UI/menús). */
  @Get('me/permissions')
  @ApiOperation({ summary: 'Permisos del usuario autenticado (para filtrar navegación en el frontend)' })
  getMyPermissions(@CurrentUser() user: JwtPayload) {
    return this.staffMembersService.getMyPermissions(user.id);
  }

  @Get()
  @UseGuards(AuthorizationGuard)
  @RequireCapability(['platform.staff.view', 'platform.roles.view'], 'OR')
  @ApiOperation({ summary: 'Listar el equipo con su rol interno activo (Flow 1)' })
  findAll(@Query() pagination: StaffMemberPaginationDto) {
    return this.staffMembersService.findAll(pagination);
  }

  @Post('invite')
  @UseGuards(AuthorizationGuard)
  @RequireCapability('platform.staff.manage')
  @AuditAction('staff-members:invite')
  @ApiOperation({ summary: 'Invitar por correo a alguien no registrado y asignarle un rol interno (Flow 1)' })
  invite(@Body() dto: InviteStaffMemberDto, @CurrentUser() user: JwtPayload) {
    return this.staffMembersService.invite(dto, user.id, user.planType);
  }

  @Post(':userId/assign-role')
  @UseGuards(AuthorizationGuard, StepUpGuard)
  @RequireCapability('platform.staff.manage')
  @RequireStepUp('platform.staff.assign_role')
  @AuditAction('staff-members:assign-role')
  @ApiParam({ name: 'userId' })
  @ApiOperation({ summary: 'Asignar o cambiar el rol interno de un usuario ya existente (Flow 1)' })
  assignRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AssignStaffRoleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.staffMembersService.assignRole(userId, dto, user.id, user.planType);
  }

  @Delete(':userId/role')
  @UseGuards(AuthorizationGuard)
  @RequireCapability('platform.staff.manage')
  @AuditAction('staff-members:revoke-role')
  @ApiParam({ name: 'userId' })
  @ApiOperation({ summary: 'Revocar el rol interno de un miembro del equipo' })
  revokeRole(@Param('userId', ParseUUIDPipe) userId: string, @CurrentUser() user: JwtPayload) {
    return this.staffMembersService.revokeRole(userId, user.planType);
  }
}
