import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { RequireCapability } from '../authorization/decorators/require-capability.decorator';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ORGANIZATION_ID_HEADER } from '../authorization/utils/organization-context.util';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CampaignQueryDto } from './dto/campaign-query.dto';
import { SubmitToCampaignDto } from './dto/submit-to-campaign.dto';
import { SelectSubmissionDto } from './dto/select-submission.dto';

/**
 * Campañas para recibir canciones (buzón de recepción). El header
 * `x-organization-id` es opcional: si viene, la campaña queda scopeada a esa
 * organización (rutas de gestión validan capability `campaign.*` + membership
 * real); si no viene, la campaña es personal del usuario autenticado — la
 * misma capability `campaign.create`/`campaign.view`/`campaign.manage` ya está
 * otorgada tanto a roles de organización como a los planes personales que
 * pueden buscar canciones en el marketplace (`marketplace.search`).
 */
@ApiTags('Campañas')
@ApiBearerAuth('JWT-auth')
@ApiHeader({ name: ORGANIZATION_ID_HEADER, required: false })
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  // ─── Crear / gestionar (organización o personal) ───────────────────────

  @Post()
  @RequireCapability('campaign.create')
  @ApiOperation({ summary: 'Crear una campaña (de tu organización activa, o personal si no envías x-organization-id)' })
  create(
    @Headers(ORGANIZATION_ID_HEADER) organizationId: string | undefined,
    @Body() dto: CreateCampaignDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.campaignsService.create(dto, organizationId, user.id);
  }

  @Get('mine')
  @RequireCapability('campaign.view')
  @ApiOperation({ summary: 'Mis campañas (activas y en historial)' })
  listMine(
    @Headers(ORGANIZATION_ID_HEADER) organizationId: string | undefined,
    @Query() query: CampaignQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.campaignsService.listMine(organizationId, user.id, query);
  }

  // ─── Público / compositor ──────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Campañas públicas activas, ordenadas por fecha de vencimiento más próxima' })
  listPublic(@Query() query: CampaignQueryDto) {
    return this.campaignsService.listPublic(query);
  }

  @Get('private/:token')
  @ApiOperation({ summary: 'Detalle de una campaña privada por su enlace único' })
  findByToken(@Param('token') token: string) {
    return this.campaignsService.findByToken(token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle público de una campaña' })
  findPublicById(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignsService.findPublicById(id);
  }

  @Get(':id/matching-tracks')
  @ApiOperation({ summary: 'Tracks propios que coinciden con los géneros/ritmos de la campaña' })
  getMatchingTracks(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.campaignsService.getMatchingTracks(id, user.id);
  }

  @Post(':id/submissions')
  @ApiOperation({ summary: 'Postular un track propio a la campaña' })
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitToCampaignDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.campaignsService.submit(id, dto.trackId, user.id);
  }

  // ─── Bandeja de entrada (organización o personal) ──────────────────────

  @Get(':id/submissions')
  @RequireCapability('campaign.manage')
  @ApiOperation({ summary: 'Bandeja de entrada de postulaciones de la campaña' })
  getSubmissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers(ORGANIZATION_ID_HEADER) organizationId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.campaignsService.getSubmissions(id, organizationId, user.id);
  }

  @Patch(':id/submissions/:submissionId/select')
  @RequireCapability('campaign.manage')
  @ApiOperation({ summary: 'Aprobar una postulación (crea la solicitud de track y sigue el flujo de licenciamiento)' })
  selectSubmission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Headers(ORGANIZATION_ID_HEADER) organizationId: string | undefined,
    @Body() dto: SelectSubmissionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.campaignsService.selectSubmission(id, submissionId, organizationId, user, dto.licenseType);
  }

  @Patch(':id/submissions/:submissionId/discard')
  @RequireCapability('campaign.manage')
  @ApiOperation({ summary: 'Descartar una postulación' })
  discardSubmission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Headers(ORGANIZATION_ID_HEADER) organizationId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.campaignsService.discardSubmission(id, submissionId, organizationId, user.id);
  }

  @Delete(':id')
  @RequireCapability('campaign.manage')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar manualmente una campaña ya cerrada, de tu historial' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers(ORGANIZATION_ID_HEADER) organizationId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.campaignsService.remove(id, organizationId, user.id);
  }
}
