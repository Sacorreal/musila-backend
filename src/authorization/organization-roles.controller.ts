import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { StepUpGuard } from 'src/auth/guards/step-up.guard';
import { RequireStepUp } from 'src/auth/decorators/require-step-up.decorator';
import { WorkspaceSecurityComplianceGuard } from 'src/auth/guards/workspace-security-compliance.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { AuditAction } from 'src/staff-audit/decorators/audit-action.decorator';
import { StaffAuditInterceptor } from 'src/staff-audit/interceptors/staff-audit.interceptor';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { RequireCapability } from './decorators/require-capability.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { SetRoleCapabilitiesDto } from './dto/set-role-capabilities.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AuthorizationGuard } from './guards/authorization.guard';
import { RoleService } from './role.service';

/**
 * Role Builder B2B (§11/§24): roles custom tenant-aware construidos con
 * capabilities del catálogo global. El backend re-valida compatibilidad y
 * escalamiento aunque la UI oculte opciones.
 */
@ApiTags('Authorization · Roles de organización')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard, WorkspaceSecurityComplianceGuard)
@UseInterceptors(StaffAuditInterceptor)
@Controller('organizations/:organizationId/roles')
export class OrganizationRolesController {
  constructor(
    private readonly roleService: RoleService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get()
  @RequireCapability(['organization.roles.view', 'platform.organizations.view'], 'OR')
  @ApiOperation({ summary: 'Listar roles de la organización (custom + SYSTEM compartidos)' })
  async findAll(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    const organization = await this.organizationsService.findById(organizationId);
    return this.roleService.findRolesForOrganization(organization);
  }

  @Get(':roleId')
  @RequireCapability(['organization.roles.view', 'platform.organizations.view'], 'OR')
  @ApiParam({ name: 'roleId' })
  @ApiOperation({ summary: 'Detalle de un rol con sus capabilities' })
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    const organization = await this.organizationsService.findById(organizationId);
    return this.roleService.getRoleForOrganization(organization, roleId);
  }

  @Post()
  @RequireCapability('organization.roles.manage')
  @AuditAction('authorization:role:create')
  @ApiOperation({ summary: 'Crear un rol custom con capabilities del catálogo' })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const organization = await this.organizationsService.findById(organizationId);
    return this.roleService.createCustomRole(organization, dto, user.id);
  }

  @Patch(':roleId')
  @RequireCapability('organization.roles.manage')
  @AuditAction('authorization:role:update')
  @ApiParam({ name: 'roleId' })
  @ApiOperation({ summary: 'Editar nombre/descripción/estado de un rol custom' })
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const organization = await this.organizationsService.findById(organizationId);
    return this.roleService.updateRole(organization, roleId, dto);
  }

  @Delete(':roleId')
  @RequireCapability('organization.roles.manage')
  @AuditAction('authorization:role:delete')
  @ApiParam({ name: 'roleId' })
  @ApiOperation({ summary: 'Eliminar un rol custom sin memberships asignadas' })
  async remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    const organization = await this.organizationsService.findById(organizationId);
    await this.roleService.deleteRole(organization, roleId);
    return { deleted: true };
  }

  @Put(':roleId/capabilities')
  @UseGuards(StepUpGuard)
  @RequireCapability('organization.roles.manage')
  @RequireStepUp('organization.roles.capabilities.update')
  @AuditAction('authorization:role:capabilities:set')
  @ApiParam({ name: 'roleId' })
  @ApiOperation({ summary: 'Reemplazar el set completo de capabilities del rol' })
  async setCapabilities(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: SetRoleCapabilitiesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const organization = await this.organizationsService.findById(organizationId);
    return this.roleService.setRoleCapabilities(
      organization,
      roleId,
      dto.capabilityIds,
      user.id,
      dto.scope,
    );
  }

  @Post(':roleId/capabilities/:capabilityId')
  @UseGuards(StepUpGuard)
  @RequireCapability('organization.roles.manage')
  @RequireStepUp('organization.roles.capabilities.update')
  @AuditAction('authorization:role:capabilities:add')
  @ApiParam({ name: 'roleId' })
  @ApiParam({ name: 'capabilityId' })
  @ApiOperation({ summary: 'Añadir una capability al rol' })
  async addCapability(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('capabilityId', ParseUUIDPipe) capabilityId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const organization = await this.organizationsService.findById(organizationId);
    return this.roleService.addRoleCapability(organization, roleId, capabilityId, user.id);
  }

  @Delete(':roleId/capabilities/:capabilityId')
  @UseGuards(StepUpGuard)
  @RequireCapability('organization.roles.manage')
  @RequireStepUp('organization.roles.capabilities.update')
  @AuditAction('authorization:role:capabilities:remove')
  @ApiParam({ name: 'roleId' })
  @ApiParam({ name: 'capabilityId' })
  @ApiOperation({ summary: 'Quitar una capability del rol' })
  async removeCapability(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('capabilityId', ParseUUIDPipe) capabilityId: string,
  ) {
    const organization = await this.organizationsService.findById(organizationId);
    return this.roleService.removeRoleCapability(organization, roleId, capabilityId);
  }
}
