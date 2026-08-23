import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { EditorialCommandCenterService } from './editorial-command-center.service';
import { CatalogHealthScoreDto } from './dto/catalog-health-score-response.dto';
import { TrackHealthScoreDto } from './dto/track-health-score-response.dto';

/**
 * Editorial Command Center de una publisher sobre el catálogo de su roster
 * (Feature 8 / Flow 5): requiere `editorial.command_center.view`, capability
 * restringida por catálogo a organizaciones tipo PUBLISHER. `assertPublisher`
 * en el service es la defensa adicional (mismo patrón de `publisher-dashboard`).
 */
@ApiTags('Editorial Command Center')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@Controller('organizations/:organizationId/editorial-command-center')
export class PublisherEditorialCommandCenterController {
  constructor(private readonly service: EditorialCommandCenterService) {}

  @Get('overview')
  @RequireCapability('editorial.command_center.view')
  @ApiOperation({ summary: 'Health Score consolidado del catálogo del roster' })
  getOverview(@Param('organizationId', ParseUUIDPipe) organizationId: string): Promise<CatalogHealthScoreDto> {
    return this.service.getCatalogOverviewForOrganization(organizationId);
  }

  @Get('tracks/:id')
  @RequireCapability('editorial.command_center.view')
  @ApiOperation({ summary: 'Health Score individual de una canción del roster' })
  @ApiParam({ name: 'id', description: 'ID de la canción (UUID)' })
  getTrackScore(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TrackHealthScoreDto> {
    return this.service.getTrackScoreForOrganization(organizationId, id);
  }
}
