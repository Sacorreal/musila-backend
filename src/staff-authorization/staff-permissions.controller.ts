import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PlansGuard } from 'src/users/guards/plans.guard';
import { AllowedPlans } from 'src/users/decorators/allowed-plans.decorator';
import { ADMIN_PLAN_TYPES } from 'src/users/entities/user-plan-type.enum';
import { StaffAuditInterceptor } from 'src/staff-audit/interceptors/staff-audit.interceptor';
import { RequireStaffPermission } from './decorators/require-staff-permission.decorator';
import { StaffPermissionGuard } from './guards/staff-permission.guard';
import { StaffPermissionsService } from './staff-permissions.service';

@ApiTags('Staff · Permisos')
@ApiBearerAuth('JWT-auth')
@AllowedPlans(...ADMIN_PLAN_TYPES)
@UseGuards(JWTAuthGuard, PlansGuard, StaffPermissionGuard)
@UseInterceptors(StaffAuditInterceptor)
@Controller('staff/permissions')
export class StaffPermissionsController {
  constructor(private readonly staffPermissionsService: StaffPermissionsService) {}

  @Get()
  @RequireStaffPermission('system:roles:view', 'system:staff:view')
  @ApiOperation({ summary: 'Catálogo de permisos disponibles, agrupado por módulo' })
  findAll() {
    return this.staffPermissionsService.findAllGroupedByModule();
  }
}
