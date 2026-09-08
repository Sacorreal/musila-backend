import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { WorkspaceSecurityComplianceGuard } from 'src/auth/guards/workspace-security-compliance.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { AuditAction } from 'src/staff-audit/decorators/audit-action.decorator';
import { StaffAuditInterceptor } from 'src/staff-audit/interceptors/staff-audit.interceptor';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { RejectBusinessRegistrationDto } from './dto/reject-business-registration.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationStatus } from './entities/organization-status.enum';
import { OrganizationsService } from './organizations.service';

/**
 * Administración de clientes B2B desde el panel de Musila (§2: el
 * superadmin crea cada organización desde la UI).
 */
@ApiTags('Organizations · Admin Musila')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard, WorkspaceSecurityComplianceGuard)
@UseInterceptors(StaffAuditInterceptor)
@Controller('admin/organizations')
export class OrganizationsAdminController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @RequireCapability('platform.organizations.view')
  @ApiOperation({ summary: 'Listar organizaciones B2B' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: OrganizationStatus,
    description: 'Filtra por estado de onboarding (ej. EN_TRAMITE para solicitudes pendientes)',
  })
  findAll(@Query('status') status?: OrganizationStatus) {
    if (status && !Object.values(OrganizationStatus).includes(status)) {
      throw new BadRequestException(`Estado '${status}' no es válido`);
    }
    return this.organizationsService.findAll(status);
  }

  @Get(':organizationId')
  @RequireCapability('platform.organizations.view')
  @ApiParam({ name: 'organizationId' })
  @ApiOperation({ summary: 'Detalle de una organización' })
  findOne(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.organizationsService.findById(organizationId);
  }

  @Post()
  @RequireCapability('platform.organizations.manage')
  @AuditAction('organizations:create')
  @ApiOperation({
    summary: 'Crear una organización B2B',
    description:
      'Crea tenant + organización + trackspace default y, opcionalmente, la subscription B2B y el Organization Admin inicial.',
  })
  create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: JwtPayload) {
    return this.organizationsService.createOrganization(dto, user.id);
  }

  @Patch(':organizationId')
  @RequireCapability('platform.organizations.manage')
  @AuditAction('organizations:update')
  @ApiParam({ name: 'organizationId' })
  @ApiOperation({ summary: 'Editar nombre, tipo o estado de una organización' })
  update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.updateOrganization(organizationId, dto);
  }

  @Post(':organizationId/approve')
  @RequireCapability('platform.organizations.manage')
  @AuditAction('organizations:business-registration:approve')
  @ApiParam({ name: 'organizationId' })
  @ApiOperation({
    summary: 'Aprobar una solicitud de registro B2B (EN_TRAMITE → APROBADA)',
    description:
      'Genera la solicitud de cobro con el precio vigente del plan, si existe. Si el plan no tiene precio configurado, la organización queda a la espera de "mark-created" (validación manual).',
  })
  approve(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.organizationsService.approveBusinessRegistration(organizationId);
  }

  @Post(':organizationId/reject')
  @RequireCapability('platform.organizations.manage')
  @AuditAction('organizations:business-registration:reject')
  @ApiParam({ name: 'organizationId' })
  @ApiOperation({ summary: 'Rechazar una solicitud de registro B2B, con motivo' })
  reject(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: RejectBusinessRegistrationDto,
  ) {
    return this.organizationsService.rejectBusinessRegistration(organizationId, dto.reason);
  }

  @Post(':organizationId/mark-created')
  @RequireCapability('platform.organizations.manage')
  @AuditAction('organizations:business-registration:mark-created')
  @ApiParam({ name: 'organizationId' })
  @ApiOperation({
    summary: 'Confirmar pago/factura manual y crear la organización (APROBADA → CREADA)',
    description:
      'Solo para planes sin precio configurado (custom o free): el admin de Musila ya validó el pago/factura fuera de banda.',
  })
  markCreated(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.organizationsService.markOrganizationCreatedManually(organizationId);
  }
}
