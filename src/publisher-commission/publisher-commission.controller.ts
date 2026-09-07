import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { PublisherCommissionService } from './publisher-commission.service';
import { UpdateCommissionPolicyDto } from './dto/update-commission-policy.dto';
import { UpsertRosterCommissionsDto } from './dto/upsert-roster-commissions.dto';

/**
 * Configuración de la comisión por anticipo de licencia de una publisher. El
 * `organizationId` de la ruta lo valida el `AuthorizationGuard` contra la
 * membership ACTIVE del usuario (tenant-aware).
 */
@ApiTags('Comisión de Publisher')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@Controller('organizations/:organizationId/commission-policy')
export class PublisherCommissionController {
  constructor(private readonly service: PublisherCommissionService) {}

  @Get()
  @RequireCapability(['organization.settings.manage', 'organization.members.view'], 'OR')
  @ApiOperation({ summary: 'Obtener la configuración de comisión (toggle + roster)' })
  getPolicy(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.service.getPolicy(organizationId);
  }

  @Put()
  @RequireCapability('organization.settings.manage')
  @ApiOperation({ summary: 'Activar o desactivar la comisión por anticipo de licencia' })
  setEnabled(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: UpdateCommissionPolicyDto,
  ) {
    return this.service.setEnabled(organizationId, dto.commissionEnabled);
  }

  @Put('roster')
  @RequireCapability('organization.settings.manage')
  @ApiOperation({ summary: 'Actualizar los porcentajes de comisión del roster' })
  upsertRoster(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: UpsertRosterCommissionsDto,
  ) {
    return this.service.upsertRosterCommissions(organizationId, dto.items);
  }
}
