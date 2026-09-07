import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { AuthorDashboardService } from './author-dashboard.service';
import {
  AuthorFinancialDto,
  AuthorOverviewDto,
  RightsComplianceDto,
  RightsIntelligenceDto,
  SongDashboardDto,
} from './dto/author-dashboard-response.dto';

@ApiTags('Author Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard)
@Controller('author-dashboard')
export class AuthorDashboardController {
  constructor(private readonly service: AuthorDashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Métricas clave del catálogo del autor' })
  getOverview(@CurrentUser() user: JwtPayload): Promise<AuthorOverviewDto> {
    return this.service.getOverview(user.id);
  }

  @Get('tracks/:id')
  @ApiOperation({ summary: 'Rendimiento individual de una canción del autor' })
  @ApiParam({ name: 'id', description: 'ID de la canción (UUID)' })
  getSongDashboard(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SongDashboardDto> {
    return this.service.getSongDashboard(user.id, id);
  }

  @Get('rights-intelligence')
  @ApiOperation({ summary: 'Indicadores de inteligencia de derechos' })
  getRightsIntelligence(@CurrentUser() user: JwtPayload): Promise<RightsIntelligenceDto> {
    return this.service.getRightsIntelligence(user.id);
  }

  @Get('rights-compliance')
  @ApiOperation({ summary: 'Indicadores de cumplimiento de derechos del catálogo' })
  getRightsCompliance(@CurrentUser() user: JwtPayload): Promise<RightsComplianceDto> {
    return this.service.getRightsCompliance(user.id);
  }

  @Get('financial')
  @ApiOperation({ summary: 'Resumen financiero (wallet) del autor' })
  getFinancial(@CurrentUser() user: JwtPayload): Promise<AuthorFinancialDto> {
    return this.service.getFinancial(user.id);
  }
}
