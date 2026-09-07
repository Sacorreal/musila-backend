import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { EditorialCommandCenterService } from './editorial-command-center.service';
import { CatalogHealthScoreDto } from './dto/catalog-health-score-response.dto';
import { TrackHealthScoreDto } from './dto/track-health-score-response.dto';

/**
 * Editorial Command Center personal del autor sobre su propio catálogo
 * (Feature 8 / Flow 5): a diferencia de `AuthorDashboard`, sí requiere
 * `AuthorizationGuard` + `editorial.command_center.view` porque el spec
 * exige restringir el acceso a planes Autor/360 (otorgada vía `plan_capabilities`).
 */
@ApiTags('Editorial Command Center')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@Controller('editorial-command-center')
export class AuthorEditorialCommandCenterController {
  constructor(private readonly service: EditorialCommandCenterService) {}

  @Get('overview')
  @RequireCapability('editorial.command_center.view')
  @ApiOperation({ summary: 'Health Score consolidado del catálogo propio del autor' })
  getOverview(@CurrentUser() user: JwtPayload): Promise<CatalogHealthScoreDto> {
    return this.service.getCatalogOverviewForAuthor(user.id);
  }

  @Get('tracks/:id')
  @RequireCapability('editorial.command_center.view')
  @ApiOperation({ summary: 'Health Score individual de una canción propia' })
  @ApiParam({ name: 'id', description: 'ID de la canción (UUID)' })
  getTrackScore(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TrackHealthScoreDto> {
    return this.service.getTrackScoreForAuthor(user.id, id);
  }
}
