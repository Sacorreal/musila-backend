import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { WorkspaceSecurityComplianceGuard } from 'src/auth/guards/workspace-security-compliance.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { BuyerDashboardService } from './buyer-dashboard.service';
import { BuyerDashboardLicensesQueryDto } from './dto/buyer-dashboard-licenses-query.dto';
import { BuyerDashboardLicensesResponseDto, BuyerOverviewDto } from './dto/buyer-dashboard-response.dto';

/**
 * Dashboard del lado comprador del marketplace: organizaciones cuyo roster de
 * artistas gestionados (ACTIVE) licencia canciones de otros autores. El
 * `organizationId` de la ruta lo valida el `AuthorizationGuard` contra la
 * membership ACTIVE del usuario (tenant-aware).
 */
@ApiTags('Buyer Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard, WorkspaceSecurityComplianceGuard)
@Controller('organizations/:organizationId/buyer-dashboard')
export class BuyerDashboardController {
  constructor(private readonly service: BuyerDashboardService) {}

  @Get('overview')
  @RequireCapability(['organization.settings.manage', 'organization.members.view'], 'OR')
  @ApiOperation({ summary: 'Métricas clave del roster comprador (reproducciones y licencias)' })
  getOverview(@Param('organizationId', ParseUUIDPipe) organizationId: string): Promise<BuyerOverviewDto> {
    return this.service.getOverview(organizationId);
  }

  @Get('licenses')
  @RequireCapability(['organization.settings.manage', 'organization.members.view'], 'OR')
  @ApiOperation({ summary: 'Canciones licenciadas por el roster comprador en un mes dado' })
  getLicenses(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: BuyerDashboardLicensesQueryDto,
  ): Promise<BuyerDashboardLicensesResponseDto> {
    return this.service.getLicenses(organizationId, query.month);
  }
}
