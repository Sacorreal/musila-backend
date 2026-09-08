import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { MembershipStatus } from '../organizations/entities/membership-status.enum';
import { Trackspace } from '../organizations/entities/trackspace.entity';
import { Track } from '../tracks/entities/track.entity';
import { User } from '../users/entities/user.entity';
import { MusicalGenre } from '../musical-genre/entities/musical-genre.entity';
import { RequestedTracksService } from '../requested-tracks/requested-tracks.service';
import { LicenseType } from '../requested-tracks/entities/license-type.enum';
import { EventBusService } from '../shared/events/event-bus.service';

import { Campaign } from './entities/campaign.entity';
import { CampaignVisibility } from './entities/campaign-visibility.enum';
import { CampaignStatus } from './entities/campaign-status.enum';
import { CampaignClosedReason } from './entities/campaign-closed-reason.enum';
import { CampaignSubmission } from './entities/campaign-submission.entity';
import { CampaignSubmissionStatus } from './entities/campaign-submission-status.enum';
import { CampaignGenreFilter } from './campaign.types';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CampaignGenreFilterInputDto } from './dto/campaign-genre-filter-input.dto';
import { CampaignQueryDto } from './dto/campaign-query.dto';
import { CampaignResponseDto } from './dto/campaign-response.dto';
import { CampaignSubmissionResponseDto } from './dto/campaign-submission-response.dto';
import { CampaignProgressDto } from './dto/campaign-progress.dto';
import { MatchingTrackResponseDto } from './dto/matching-track-response.dto';
import { CampaignErrorCode } from './campaigns.constants';

const SUBMISSION_LIVE_STATUSES = [
  CampaignSubmissionStatus.PENDING,
  CampaignSubmissionStatus.SELECTED,
  CampaignSubmissionStatus.LICENSED,
];

/** Identifica quién actúa: opcionalmente en nombre de una organización, o a título personal. */
interface CampaignActorContext {
  organizationId?: string;
  actorUserId: string;
}

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(CampaignSubmission)
    private readonly submissionRepo: Repository<CampaignSubmission>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepo: Repository<OrganizationMembership>,
    @InjectRepository(Trackspace)
    private readonly trackspaceRepo: Repository<Trackspace>,
    @InjectRepository(Track)
    private readonly trackRepo: Repository<Track>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(MusicalGenre)
    private readonly genreRepo: Repository<MusicalGenre>,
    private readonly requestedTracksService: RequestedTracksService,
    private readonly eventBus: EventBusService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Crear campaña (organización o personal) ───────────────────────────

  /**
   * `organizationId` es opcional: cualquier usuario que pueda buscar canciones
   * en el marketplace (capability `campaign.create`, otorgada tanto a roles de
   * organización como a planes personales) puede crear una campaña propia; si
   * actúa en nombre de una organización, la campaña queda scopeada a ella.
   */
  async create(
    dto: CreateCampaignDto,
    organizationId: string | undefined,
    actorUserId: string,
  ): Promise<CampaignResponseDto> {
    if (organizationId) {
      await this.assertOrganizationActive(organizationId);
      await this.assertActorMembership(organizationId, actorUserId);
    }

    const { filters, genreNames } = await this.resolveGenreFilters(dto.genres);
    const authorName = dto.authorName?.trim() || (await this.resolveDefaultAuthorName(organizationId, actorUserId));

    const campaign = this.campaignRepo.create({
      organizationId: organizationId ?? null,
      createdByUserId: actorUserId,
      title: dto.title.trim(),
      authorName,
      description: this.buildDescription(genreNames),
      visibility: dto.visibility ?? CampaignVisibility.PUBLIC,
      privateToken:
        (dto.visibility ?? CampaignVisibility.PUBLIC) === CampaignVisibility.PRIVATE
          ? this.generateToken()
          : null,
      coverUrl: dto.coverUrl ?? null,
      genreFilters: filters,
      songsPerComposerLimit: dto.songsPerComposerLimit,
      requiredSongsCount: dto.requiredSongsCount,
      deadline: new Date(dto.deadline),
      status: CampaignStatus.ACTIVE,
    });

    const saved = await this.campaignRepo.save(campaign);
    const displayCoverUrl = (await this.hydrateDisplayCoversMap([saved])).get(saved.id) ?? null;
    return CampaignResponseDto.fromEntity(saved, { displayCoverUrl, includePrivateToken: true });
  }

  // ─── Listados públicos ──────────────────────────────────────────────────

  /** Home "Campañas": públicas, activas, ordenadas por fecha de vencimiento más próxima. */
  async listPublic(query: CampaignQueryDto): Promise<{ data: CampaignResponseDto[]; total: number }> {
    const [campaigns, total] = await this.campaignRepo.findAndCount({
      where: { visibility: CampaignVisibility.PUBLIC, status: CampaignStatus.ACTIVE },
      order: { deadline: 'ASC' },
      take: query.limit,
      skip: query.offset,
    });

    const data = await this.hydrateDisplayCovers(campaigns);
    return { data, total };
  }

  /** Detalle público (compositor evaluando si postularse). */
  async findPublicById(id: string): Promise<CampaignResponseDto> {
    const campaign = await this.campaignRepo.findOne({ where: { id, visibility: CampaignVisibility.PUBLIC } });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    return this.toDetailDto(campaign);
  }

  /** Detalle de una campaña privada, accedida por su enlace único. */
  async findByToken(token: string): Promise<CampaignResponseDto> {
    const campaign = await this.campaignRepo.findOne({ where: { privateToken: token } });
    if (!campaign) throw new NotFoundException('Enlace de campaña inválido o expirado');
    return this.toDetailDto(campaign);
  }

  // ─── Historial propio (organización o personal) ────────────────────────

  async listMine(
    organizationId: string | undefined,
    actorUserId: string,
    query: CampaignQueryDto,
  ): Promise<{ data: CampaignResponseDto[]; total: number }> {
    if (organizationId) {
      await this.assertActorMembership(organizationId, actorUserId);
    }

    const where = organizationId
      ? { organizationId, ...(query.status ? { status: query.status } : {}) }
      : { organizationId: IsNull(), createdByUserId: actorUserId, ...(query.status ? { status: query.status } : {}) };

    const [campaigns, total] = await this.campaignRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: query.limit,
      skip: query.offset,
      withDeleted: false,
    });

    if (campaigns.length === 0) return { data: [], total: 0 };

    const progressByCampaign = await this.buildProgressMap(campaigns.map((c) => c.id));
    const coverByCampaign = await this.hydrateDisplayCoversMap(campaigns);

    const data = campaigns.map((c) =>
      CampaignResponseDto.fromEntity(c, {
        displayCoverUrl: coverByCampaign.get(c.id) ?? null,
        progress: progressByCampaign.get(c.id),
        includePrivateToken: true,
      }),
    );
    return { data, total };
  }

  // ─── Compositor: tracks que matchean ───────────────────────────────────

  async getMatchingTracks(campaignId: string, composerId: string): Promise<MatchingTrackResponseDto[]> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    const tracks = await this.trackRepo
      .createQueryBuilder('track')
      .leftJoinAndSelect('track.authors', 'author')
      .where('author.id = :composerId', { composerId })
      .andWhere('track.isAvailable = true')
      .getMany();

    const matching = tracks.filter((track) => this.trackMatchesCampaign(track, campaign.genreFilters));
    if (matching.length === 0) return [];

    const existing = await this.submissionRepo.find({
      where: { campaignId, trackId: In(matching.map((t) => t.id)) },
      select: { trackId: true },
    });
    const submittedTrackIds = new Set(existing.map((s) => s.trackId));

    return matching.map((track) => MatchingTrackResponseDto.fromEntity(track, submittedTrackIds.has(track.id)));
  }

  // ─── Compositor: postular ───────────────────────────────────────────────

  async submit(campaignId: string, trackId: string, composerId: string): Promise<CampaignSubmissionResponseDto> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    if (campaign.status !== CampaignStatus.ACTIVE || campaign.deadline.getTime() <= Date.now()) {
      throw new ConflictException({
        message: 'Esta campaña ya no está recibiendo canciones',
        code: CampaignErrorCode.CAMPAIGN_NOT_ACTIVE,
      });
    }

    const track = await this.trackRepo.findOne({ where: { id: trackId }, relations: ['authors'] });
    if (!track) throw new NotFoundException('Track no encontrado');
    if (!track.authors.some((a) => a.id === composerId)) {
      throw new ForbiddenException('No puedes postular una canción que no es tuya');
    }
    if (!track.isAvailable) {
      throw new BadRequestException('Debes publicar la canción antes de postularla a una campaña');
    }
    if (!this.trackMatchesCampaign(track, campaign.genreFilters)) {
      throw new BadRequestException({
        message: 'La canción no coincide con los géneros/ritmos buscados por la campaña',
        code: CampaignErrorCode.TRACK_NOT_MATCHING,
      });
    }

    const currentCount = await this.submissionRepo.count({
      where: { campaignId, composerId, status: In(SUBMISSION_LIVE_STATUSES) },
    });
    if (currentCount >= campaign.songsPerComposerLimit) {
      throw new ConflictException({
        message: 'Alcanzaste el cupo de canciones permitido por compositor en esta campaña',
        code: CampaignErrorCode.COMPOSER_QUOTA_EXCEEDED,
      });
    }

    let submission: CampaignSubmission;
    try {
      submission = await this.submissionRepo.save(
        this.submissionRepo.create({ campaignId, trackId, composerId, status: CampaignSubmissionStatus.PENDING }),
      );
    } catch {
      throw new ConflictException({
        message: 'Ya postulaste esta canción a esta campaña',
        code: CampaignErrorCode.DUPLICATE_SUBMISSION,
      });
    }

    submission.track = track;
    this.eventBus.emit('campaign.submission.received', {
      campaignId,
      campaignTitle: campaign.title,
      organizationId: campaign.organizationId ?? null,
      ownerUserId: campaign.createdByUserId,
      submissionId: submission.id,
      composerId,
      trackTitle: track.title,
    });

    return CampaignSubmissionResponseDto.fromEntity(submission);
  }

  // ─── Dueño (organización o personal): bandeja de entrada ───────────────

  async getSubmissions(
    campaignId: string,
    organizationId: string | undefined,
    actorUserId: string,
  ): Promise<CampaignSubmissionResponseDto[]> {
    if (organizationId) await this.assertActorMembership(organizationId, actorUserId);
    await this.getOwnedCampaign(campaignId, { organizationId, actorUserId });

    const submissions = await this.submissionRepo.find({
      where: { campaignId },
      relations: ['track', 'composer'],
      order: { createdAt: 'ASC' },
    });
    return submissions.map((s) => CampaignSubmissionResponseDto.fromEntity(s));
  }

  async selectSubmission(
    campaignId: string,
    submissionId: string,
    organizationId: string | undefined,
    actorUser: JwtPayload,
    licenseType: LicenseType,
  ): Promise<CampaignSubmissionResponseDto> {
    if (organizationId) await this.assertActorMembership(organizationId, actorUser.id);
    const campaign = await this.getOwnedCampaign(campaignId, { organizationId, actorUserId: actorUser.id });

    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId, campaignId },
      relations: ['track'],
    });
    if (!submission) throw new NotFoundException('Postulación no encontrada');
    if (submission.status !== CampaignSubmissionStatus.PENDING) {
      throw new ConflictException({
        message: 'Esta postulación ya fue procesada',
        code: CampaignErrorCode.INVALID_STATE_TRANSITION,
      });
    }

    const requestedTrack = await this.requestedTracksService.createRequestedTracksService(
      { trackId: submission.trackId, licenseType },
      actorUser,
    );

    submission.status = CampaignSubmissionStatus.SELECTED;
    submission.requestedTrackId = requestedTrack.id;
    await this.submissionRepo.save(submission);

    this.eventBus.emit('campaign.submission.selected', {
      campaignId,
      campaignTitle: campaign.title,
      organizationId: campaign.organizationId ?? null,
      ownerUserId: campaign.createdByUserId,
      submissionId: submission.id,
      composerId: submission.composerId,
      trackTitle: submission.track?.title ?? '',
    });

    await this.closeIfQuotaReached(campaign);

    return CampaignSubmissionResponseDto.fromEntity(submission);
  }

  async discardSubmission(
    campaignId: string,
    submissionId: string,
    organizationId: string | undefined,
    actorUserId: string,
  ): Promise<CampaignSubmissionResponseDto> {
    if (organizationId) await this.assertActorMembership(organizationId, actorUserId);
    const campaign = await this.getOwnedCampaign(campaignId, { organizationId, actorUserId });

    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId, campaignId },
      relations: ['track'],
    });
    if (!submission) throw new NotFoundException('Postulación no encontrada');
    if (submission.status !== CampaignSubmissionStatus.PENDING) {
      throw new ConflictException({
        message: 'Esta postulación ya fue procesada',
        code: CampaignErrorCode.INVALID_STATE_TRANSITION,
      });
    }

    submission.status = CampaignSubmissionStatus.DISCARDED;
    await this.submissionRepo.save(submission);

    this.eventBus.emit('campaign.submission.discarded', {
      campaignId,
      campaignTitle: campaign.title,
      organizationId: campaign.organizationId ?? null,
      ownerUserId: campaign.createdByUserId,
      submissionId: submission.id,
      composerId: submission.composerId,
      trackTitle: submission.track?.title ?? '',
    });

    return CampaignSubmissionResponseDto.fromEntity(submission);
  }

  // ─── Borrado manual (solo desde el historial, campaña cerrada) ─────────

  async remove(campaignId: string, organizationId: string | undefined, actorUserId: string): Promise<void> {
    if (organizationId) await this.assertActorMembership(organizationId, actorUserId);
    const campaign = await this.getOwnedCampaign(campaignId, { organizationId, actorUserId });
    if (campaign.status !== CampaignStatus.CLOSED) {
      throw new ConflictException({
        message: 'Solo puedes eliminar una campaña ya cerrada',
        code: CampaignErrorCode.CAMPAIGN_NOT_CLOSED,
      });
    }
    await this.campaignRepo.softRemove(campaign);
  }

  // ─── Consumido por el listener de contratos cumplidos ──────────────────

  async markLicensedByRequestedTrackId(requestedTrackId: string): Promise<void> {
    const submission = await this.submissionRepo.findOne({
      where: { requestedTrackId, status: CampaignSubmissionStatus.SELECTED },
    });
    if (!submission) return;
    submission.status = CampaignSubmissionStatus.LICENSED;
    await this.submissionRepo.save(submission);
  }

  // ─── Validaciones privadas ──────────────────────────────────────────────

  private async assertOrganizationActive(organizationId: string): Promise<void> {
    const org = await this.organizationRepo.findOne({ where: { id: organizationId } });
    if (!org || !org.isActive) throw new NotFoundException('Organización no encontrada o inactiva');
  }

  private async assertActorMembership(organizationId: string, userId: string): Promise<void> {
    const membership = await this.membershipRepo.findOne({
      where: { organizationId, userId, status: MembershipStatus.ACTIVE },
    });
    if (!membership) throw new ForbiddenException('No perteneces a esta organización');
  }

  /** Verifica que la campaña sea de la organización indicada, o —si es personal— del propio actor. */
  private async getOwnedCampaign(campaignId: string, ctx: CampaignActorContext): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    if (campaign.organizationId) {
      if (campaign.organizationId !== ctx.organizationId) {
        throw new ForbiddenException('La campaña no pertenece a esta organización');
      }
    } else if (campaign.createdByUserId !== ctx.actorUserId) {
      throw new ForbiddenException('La campaña no te pertenece');
    }

    return campaign;
  }

  /** Valida que cada ritmo pedido pertenezca al catálogo del género seleccionado (§1). */
  private async resolveGenreFilters(
    inputs: CampaignGenreFilterInputDto[],
  ): Promise<{ filters: CampaignGenreFilter[]; genreNames: string[] }> {
    const genres = await this.genreRepo.find({ where: { id: In(inputs.map((i) => i.genreId)) } });
    const genreMap = new Map(genres.map((g) => [g.id, g]));

    const filters: CampaignGenreFilter[] = inputs.map((input) => {
      const genre = genreMap.get(input.genreId);
      if (!genre) throw new NotFoundException(`El género ${input.genreId} no existe`);

      const catalog = (genre.ritmo ?? []).map((r) => r.toLowerCase());
      const requested = (input.ritmos ?? []).filter((r) => r.trim().length > 0);

      if (requested.length > 0) {
        const invalid = requested.filter((r) => !catalog.includes(r.toLowerCase()));
        if (invalid.length > 0) {
          throw new BadRequestException({
            message: `Los ritmos [${invalid.join(', ')}] no pertenecen al género "${genre.genre}"`,
            code: CampaignErrorCode.INVALID_RITMO_FOR_GENRE,
          });
        }
      }

      return { genreId: genre.id, genreName: genre.genre, ritmos: requested.length > 0 ? requested : null };
    });

    return { filters, genreNames: filters.map((f) => f.genreName) };
  }

  private buildDescription(genreNames: string[]): string {
    return `Géneros buscados: ${genreNames.join(', ')}`;
  }

  private generateToken(): string {
    return randomBytes(24).toString('base64url');
  }

  /** Sello (nombre del workspace/organización) o, si es personal, el nombre del compositor. */
  private async resolveDefaultAuthorName(organizationId: string | undefined, actorUserId: string): Promise<string> {
    if (organizationId) {
      const trackspace = await this.trackspaceRepo.findOne({ where: { organizationId, isDefault: true } });
      if (trackspace?.name) return trackspace.name;
      const org = await this.organizationRepo.findOne({ where: { id: organizationId } });
      return org?.name ?? 'Sello';
    }

    const user = await this.userRepo.findOne({ where: { id: actorUserId } });
    const fullName = [user?.name, user?.lastName].filter(Boolean).join(' ').trim();
    return fullName || user?.name || 'Compositor';
  }

  private async hydrateDisplayCovers(campaigns: Campaign[]): Promise<CampaignResponseDto[]> {
    const map = await this.hydrateDisplayCoversMap(campaigns);
    return campaigns.map((c) => CampaignResponseDto.fromEntity(c, { displayCoverUrl: map.get(c.id) ?? null }));
  }

  /**
   * Cover propio > logo del workspace default del sello (campaña de
   * organización) o avatar del compositor (campaña personal) > null (la UI
   * muestra iniciales).
   */
  private async hydrateDisplayCoversMap(campaigns: Campaign[]): Promise<Map<string, string | null>> {
    const withoutCover = campaigns.filter((c) => !c.coverUrl);
    const missingCoverOrgIds = [...new Set(withoutCover.filter((c) => c.organizationId).map((c) => c.organizationId!))];
    const missingCoverUserIds = [
      ...new Set(withoutCover.filter((c) => !c.organizationId).map((c) => c.createdByUserId)),
    ];

    const [trackspaces, users] = await Promise.all([
      missingCoverOrgIds.length
        ? this.trackspaceRepo.find({ where: { organizationId: In(missingCoverOrgIds), isDefault: true } })
        : Promise.resolve([]),
      missingCoverUserIds.length
        ? this.userRepo.find({ where: { id: In(missingCoverUserIds) }, select: { id: true, avatarUrl: true } })
        : Promise.resolve([]),
    ]);
    const logoByOrg = new Map(trackspaces.map((t) => [t.organizationId, t.logoUrl ?? null]));
    const avatarByUser = new Map(users.map((u) => [u.id, u.avatarUrl ?? null]));

    const map = new Map<string, string | null>();
    for (const c of campaigns) {
      const fallback = c.organizationId ? (logoByOrg.get(c.organizationId) ?? null) : (avatarByUser.get(c.createdByUserId) ?? null);
      map.set(c.id, c.coverUrl ?? fallback);
    }
    return map;
  }

  private async toDetailDto(campaign: Campaign): Promise<CampaignResponseDto> {
    const [displayCoverUrl, progress] = await Promise.all([
      this.hydrateDisplayCoversMap([campaign]).then((map) => map.get(campaign.id) ?? null),
      this.buildProgress(campaign.id, campaign.requiredSongsCount),
    ]);
    return CampaignResponseDto.fromEntity(campaign, { displayCoverUrl, progress });
  }

  private async buildProgress(campaignId: string, requiredSongsCount: number): Promise<CampaignProgressDto> {
    const map = await this.buildProgressMap([campaignId]);
    return (
      map.get(campaignId) ??
      CampaignProgressDto.build({
        requiredSongsCount,
        pendingCount: 0,
        selectedCount: 0,
        licensedCount: 0,
        discardedCount: 0,
      })
    );
  }

  private async buildProgressMap(campaignIds: string[]): Promise<Map<string, CampaignProgressDto>> {
    if (campaignIds.length === 0) return new Map();

    const campaigns = await this.campaignRepo.find({
      where: { id: In(campaignIds) },
      select: { id: true, requiredSongsCount: true },
    });
    const requiredByCampaign = new Map(campaigns.map((c) => [c.id, c.requiredSongsCount]));

    const rows = await this.submissionRepo
      .createQueryBuilder('s')
      .select('s.campaignId', 'campaignId')
      .addSelect('s.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('s.campaignId IN (:...campaignIds)', { campaignIds })
      .groupBy('s.campaignId')
      .addGroupBy('s.status')
      .getRawMany<{ campaignId: string; status: CampaignSubmissionStatus; count: string }>();

    const counts = new Map<string, Record<CampaignSubmissionStatus, number>>();
    for (const id of campaignIds) {
      counts.set(id, {
        [CampaignSubmissionStatus.PENDING]: 0,
        [CampaignSubmissionStatus.SELECTED]: 0,
        [CampaignSubmissionStatus.DISCARDED]: 0,
        [CampaignSubmissionStatus.LICENSED]: 0,
      });
    }
    for (const row of rows) {
      const bucket = counts.get(row.campaignId);
      if (bucket) bucket[row.status] = Number(row.count);
    }

    const result = new Map<string, CampaignProgressDto>();
    for (const id of campaignIds) {
      const bucket = counts.get(id)!;
      result.set(
        id,
        CampaignProgressDto.build({
          requiredSongsCount: requiredByCampaign.get(id) ?? 0,
          pendingCount: bucket[CampaignSubmissionStatus.PENDING],
          selectedCount: bucket[CampaignSubmissionStatus.SELECTED] + bucket[CampaignSubmissionStatus.LICENSED],
          licensedCount: bucket[CampaignSubmissionStatus.LICENSED],
          discardedCount: bucket[CampaignSubmissionStatus.DISCARDED],
        }),
      );
    }
    return result;
  }

  /** ¿El track cae dentro de alguno de los filtros de género/ritmo de la campaña? */
  private trackMatchesCampaign(track: Track, filters: CampaignGenreFilter[]): boolean {
    const match = filters.find((f) => f.genreId === track.genre?.id);
    if (!match) return false;
    if (!match.ritmos) return true; // "todos los ritmos del género"
    if (!track.ritmo) return false;
    return match.ritmos.some((r) => r.toLowerCase() === track.ritmo!.toLowerCase());
  }

  /** Cierra la campaña si ya se alcanzó el cupo de canciones requeridas (cierre síncrono, no espera al cron). */
  private async closeIfQuotaReached(campaign: Campaign): Promise<void> {
    const selectedCount = await this.submissionRepo.count({
      where: {
        campaignId: campaign.id,
        status: In([CampaignSubmissionStatus.SELECTED, CampaignSubmissionStatus.LICENSED]),
      },
    });
    if (selectedCount < campaign.requiredSongsCount) return;

    const result = await this.dataSource
      .getRepository(Campaign)
      .createQueryBuilder()
      .update(Campaign)
      .set({ status: CampaignStatus.CLOSED, closedReason: CampaignClosedReason.QUOTA, closedAt: new Date() })
      .where('id = :id AND status = :status', { id: campaign.id, status: CampaignStatus.ACTIVE })
      .execute();

    if (result.affected) {
      this.logger.log(`[campaign] ${campaign.id} cerrada por cupo alcanzado`);
    }
  }
}
