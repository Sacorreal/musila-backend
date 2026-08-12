import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { PublisherDashboardService } from './publisher-dashboard.service';
import {
  PublisherFinancialDto,
  PublisherOverviewDto,
  PublisherRightsComplianceDto,
  PublisherRightsIntelligenceDto,
  SongDashboardDto,
} from './dto/publisher-dashboard-response.dto';

/**
 * Dashboards de una publisher sobre el catálogo de su roster. El
 * `organizationId` de la ruta lo valida el `AuthorizationGuard` contra la
 * membership ACTIVE del usuario (tenant-aware).
 */
@ApiTags('Publisher Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@Controller('organizations/:organizationId/publisher-dashboard')
export class PublisherDashboardController {
  constructor(private readonly service: PublisherDashboardService) {}

  @Get('overview')
  @RequireCapability(['organization.settings.manage', 'organization.members.view'], 'OR')
  @ApiOperation({ summary: 'Métricas clave del catálogo del roster' })
  getOverview(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<PublisherOverviewDto> {
    return this.service.getOverview(organizationId);
  }

  @Get('tracks/:id')
  @RequireCapability(['organization.settings.manage', 'organization.members.view'], 'OR')
  @ApiOperation({ summary: 'Rendimiento individual de una canción del roster' })
  @ApiParam({ name: 'id', description: 'ID de la canción (UUID)' })
  getSongDashboard(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SongDashboardDto> {
    return this.service.getSongDashboard(organizationId, id);
  }

  @Get('rights-intelligence')
  @RequireCapability(['organization.settings.manage', 'organization.members.view'], 'OR')
  @ApiOperation({ summary: 'Indicadores de inteligencia de derechos del catálogo' })
  getRightsIntelligence(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<PublisherRightsIntelligenceDto> {
    return this.service.getRightsIntelligence(organizationId);
  }

  @Get('rights-compliance')
  @RequireCapability(['organization.settings.manage', 'organization.members.view'], 'OR')
  @ApiOperation({ summary: 'Indicadores de cumplimiento de derechos del catálogo' })
  getRightsCompliance(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<PublisherRightsComplianceDto> {
    return this.service.getRightsCompliance(organizationId);
  }

  @Get('financial')
  @RequireCapability('organization.settings.manage')
  @ApiOperation({ summary: 'Resumen financiero (wallet) de la organización' })
  getFinancial(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<PublisherFinancialDto> {
    return this.service.getFinancial(organizationId);
  }
}
