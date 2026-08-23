import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Track } from 'src/tracks/entities/track.entity';
import { RegistrationFile } from 'src/registration-file/entities/registration-file.entity';
import { Certificate } from 'src/certificates/entities/certificate.entity';
import { IntellectualProperty } from 'src/intellectual-property/entities/intellectual-property.entity';
import { Split } from 'src/splits/entities/split.entity';
import { Organization } from 'src/organizations/entities/organization.entity';
import { OrganizationType } from 'src/organizations/entities/organization-type.enum';
import { RosterMembership } from 'src/organizations/entities/roster-membership.entity';
import { MembershipStatus } from 'src/organizations/entities/membership-status.enum';
import { PublisherShareService } from 'src/publisher-share/publisher-share.service';
import { HealthScoreCalculatorService } from './health-score-calculator.service';
import { TrackHealthBundle } from './types/health-score-bundle.type';
import { TrackHealthScoreDto } from './dto/track-health-score-response.dto';
import { CatalogHealthScoreDto, CatalogHealthScoreItemDto } from './dto/catalog-health-score-response.dto';

/**
 * Orquesta el Editorial Command Center: trae el catálogo (scopeado por
 * organización publisher o por autor), arma el `TrackHealthBundle` de cada
 * obra con queries batched (evita N+1 sobre catálogos de hasta 10.000 obras,
 * ver NFR de latencia) y delega el cálculo puro a `HealthScoreCalculatorService`.
 */
@Injectable()
export class EditorialCommandCenterService {
  constructor(
    @InjectRepository(Track)
    private readonly trackRepo: Repository<Track>,
    @InjectRepository(RegistrationFile)
    private readonly registrationFileRepo: Repository<RegistrationFile>,
    @InjectRepository(Certificate)
    private readonly certificateRepo: Repository<Certificate>,
    @InjectRepository(IntellectualProperty)
    private readonly intellectualPropertyRepo: Repository<IntellectualProperty>,
    @InjectRepository(Split)
    private readonly splitRepo: Repository<Split>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(RosterMembership)
    private readonly rosterRepo: Repository<RosterMembership>,
    private readonly publisherShareService: PublisherShareService,
    private readonly calculator: HealthScoreCalculatorService,
  ) {}

  // ─── Publisher (organización) ──────────────────────────────────────────

  async getCatalogOverviewForOrganization(organizationId: string): Promise<CatalogHealthScoreDto> {
    await this.assertPublisher(organizationId);
    const rosterUserIds = await this.getRosterUserIds(organizationId);
    const trackIds = await this.getTrackIdsForAuthors(rosterUserIds);
    return this.buildCatalogScore(trackIds);
  }

  async getTrackScoreForOrganization(organizationId: string, trackId: string): Promise<TrackHealthScoreDto> {
    await this.assertPublisher(organizationId);
    const rosterUserIds = await this.getRosterUserIds(organizationId);
    const track = await this.findTrackWithAuthorsOrFail(trackId);

    const belongsToRoster = track.authors?.some((author) => rosterUserIds.includes(author.id));
    if (!belongsToRoster) {
      throw new NotFoundException('La canción no pertenece al roster de esta organización');
    }

    return this.calculateTrack(trackId);
  }

  // ─── Autor (personal) ──────────────────────────────────────────────────

  async getCatalogOverviewForAuthor(userId: string): Promise<CatalogHealthScoreDto> {
    const trackIds = await this.getTrackIdsForAuthors([userId]);
    return this.buildCatalogScore(trackIds);
  }

  async getTrackScoreForAuthor(userId: string, trackId: string): Promise<TrackHealthScoreDto> {
    const track = await this.findTrackWithAuthorsOrFail(trackId);

    const isOwnTrack = track.authors?.some((author) => author.id === userId);
    if (!isOwnTrack) {
      throw new ForbiddenException('No tienes acceso al Health Score de esta canción');
    }

    return this.calculateTrack(trackId);
  }

  // ─── Cálculo compartido ─────────────────────────────────────────────────

  private async calculateTrack(trackId: string): Promise<TrackHealthScoreDto> {
    const [bundle] = await this.buildBundles([trackId]);
    return this.calculator.calculate(bundle);
  }

  private async buildCatalogScore(trackIds: string[]): Promise<CatalogHealthScoreDto> {
    if (!trackIds.length) {
      return {
        globalScore: 0,
        totalTracks: 0,
        categoryAverages: { documentary: 0, legal: 0, intellectualProperty: 0, commercial: 0 },
        tracks: [],
      };
    }

    const bundles = await this.buildBundles(trackIds);
    const scores = bundles.map((bundle) => this.calculator.calculate(bundle));

    const average = (values: number[]): number =>
      values.length ? this.round(values.reduce((acc, v) => acc + v, 0) / values.length) : 0;

    const tracks: CatalogHealthScoreItemDto[] = scores.map((score) => ({
      trackId: score.trackId,
      title: score.title,
      overallScore: score.overallScore,
      documentaryScore: score.documentary.score,
      legalScore: score.legal.score,
      intellectualPropertyScore: score.intellectualProperty.score,
      commercialScore: score.commercial.score,
    }));

    return {
      globalScore: average(scores.map((s) => s.overallScore)),
      totalTracks: scores.length,
      categoryAverages: {
        documentary: average(scores.map((s) => s.documentary.score)),
        legal: average(scores.map((s) => s.legal.score)),
        intellectualProperty: average(scores.map((s) => s.intellectualProperty.score)),
        commercial: average(scores.map((s) => s.commercial.score)),
      },
      tracks,
    };
  }

  /** Arma el `TrackHealthBundle` de cada track con queries batched (una por entidad, no una por track). */
  private async buildBundles(trackIds: string[]): Promise<TrackHealthBundle[]> {
    if (!trackIds.length) return [];

    const [tracks, registrationFiles, certificates, intellectualProperties, splits] = await Promise.all([
      this.trackRepo.find({ where: { id: In(trackIds) }, relations: ['authors'] }),
      this.registrationFileRepo.find({
        where: { track: { id: In(trackIds) } },
        relations: ['profileStatuses', 'track'],
      }),
      this.certificateRepo.find({ where: { track: { id: In(trackIds) } }, relations: ['track'] }),
      this.intellectualPropertyRepo.find({ where: { track: { id: In(trackIds) } }, relations: ['track'] }),
      this.splitRepo.find({
        where: { track: { id: In(trackIds) } },
        relations: ['authors', 'createdBy', 'track'],
      }),
    ]);

    const registrationFileByTrack = new Map(registrationFiles.map((rf) => [rf.track.id, rf]));
    const certificateByTrack = new Map(certificates.map((c) => [c.track.id, c]));
    const splitByTrack = new Map(splits.map((s) => [s.track.id, s]));

    const intellectualPropertiesByTrack = new Map<string, IntellectualProperty[]>();
    for (const ip of intellectualProperties) {
      const list = intellectualPropertiesByTrack.get(ip.track.id) ?? [];
      list.push(ip);
      intellectualPropertiesByTrack.set(ip.track.id, list);
    }

    // Autor principal por track: el creador del split si ya existe, o el primer autor.
    const primaryAuthorIdByTrack = new Map<string, string>();
    for (const track of tracks) {
      const split = splitByTrack.get(track.id);
      const primaryAuthorId = split?.createdBy?.id ?? track.authors?.[0]?.id;
      if (primaryAuthorId) primaryAuthorIdByTrack.set(track.id, primaryAuthorId);
    }
    const publisherSharesByUser = await this.publisherShareService.resolveForUsers([
      ...primaryAuthorIdByTrack.values(),
    ]);

    return tracks.map((track) => ({
      track,
      registrationFile: registrationFileByTrack.get(track.id) ?? null,
      certificate: certificateByTrack.get(track.id) ?? null,
      intellectualProperties: intellectualPropertiesByTrack.get(track.id) ?? [],
      split: splitByTrack.get(track.id) ?? null,
      publisherShares: publisherSharesByUser.get(primaryAuthorIdByTrack.get(track.id) ?? '') ?? [],
    }));
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private async findTrackWithAuthorsOrFail(trackId: string): Promise<Track> {
    const track = await this.trackRepo.findOne({ where: { id: trackId }, relations: ['authors'] });
    if (!track) throw new NotFoundException('La canción no existe');
    return track;
  }

  private async getRosterUserIds(organizationId: string): Promise<string[]> {
    const members = await this.rosterRepo.find({
      where: { organizationId, status: MembershipStatus.ACTIVE },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  private async getTrackIdsForAuthors(userIds: string[]): Promise<string[]> {
    if (!userIds.length) return [];
    const rows = await this.trackRepo
      .createQueryBuilder('track')
      .select('track.id', 'id')
      .innerJoin('track.authors', 'author', 'author.id IN (:...userIds)', { userIds })
      .groupBy('track.id')
      .getRawMany<{ id: string }>();
    return rows.map((r) => r.id);
  }

  private async assertPublisher(organizationId: string): Promise<void> {
    const org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organización no encontrada');
    if (org.type !== OrganizationType.PUBLISHER) {
      throw new BadRequestException('El Editorial Command Center solo aplica a organizaciones tipo PUBLISHER');
    }
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
