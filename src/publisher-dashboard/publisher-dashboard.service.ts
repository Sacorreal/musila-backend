import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Track } from 'src/tracks/entities/track.entity';
import { TrackPlaysService } from 'src/tracks/track-plays.service';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { RequestsStatus } from 'src/requested-tracks/entities/requests-status.enum';
import { LicensePaymentStatus } from 'src/requested-tracks/entities/license-payment-status.enum';
import { WalletEarning } from 'src/wallet/entities/wallet-earning.entity';
import { WalletEarningRole } from 'src/wallet/entities/wallet-earning-role.enum';
import { WalletEarningsService } from 'src/wallet/services/wallet-earnings.service';
import { LicenseCollection } from 'src/license-collections/entities/license-collection.entity';
import { CollectionStatus } from 'src/license-collections/entities/collection-status.enum';
import { Split } from 'src/splits/entities/split.entity';
import { SplitStatus } from 'src/splits/entities/split-status.enum';
import { RegistrationFile } from 'src/registration-file/entities/registration-file.entity';
import { RegistrationFileStatus } from 'src/registration-file/entities/registration-file-status.enum';
import { Organization } from 'src/organizations/entities/organization.entity';
import { OrganizationType } from 'src/organizations/entities/organization-type.enum';
import { RosterMembership } from 'src/organizations/entities/roster-membership.entity';
import { MembershipStatus } from 'src/organizations/entities/membership-status.enum';
import {
  ComposerIncomeDto,
  NextPaymentDto,
  PublisherFinancialDto,
  PublisherOverviewDto,
  PublisherRightsComplianceDto,
  PublisherRightsIntelligenceDto,
  RankedItemDto,
  SongDashboardDto,
} from './dto/publisher-dashboard-response.dto';

const CURRENCY = 'COP';
const TOP_LIMIT = 5;

interface RosterMember {
  userId: string;
  name: string;
}

/**
 * Servicio de solo lectura que agrega las métricas de los dashboards de una
 * publisher reutilizando los repositorios existentes. El alcance es el roster
 * ACTIVE de la organización: el catálogo se filtra por `Track.authors` sobre los
 * miembros del roster; solicitudes, licencias y cobros por `RequestedTrack.owner`.
 * Las finanzas reflejan la wallet de la organización (comisiones), no la de los
 * autores.
 */
@Injectable()
export class PublisherDashboardService {
  constructor(
    @InjectRepository(Track)
    private readonly trackRepo: Repository<Track>,
    @InjectRepository(RequestedTrack)
    private readonly requestedTrackRepo: Repository<RequestedTrack>,
    @InjectRepository(WalletEarning)
    private readonly earningRepo: Repository<WalletEarning>,
    @InjectRepository(LicenseCollection)
    private readonly collectionRepo: Repository<LicenseCollection>,
    @InjectRepository(RosterMembership)
    private readonly rosterRepo: Repository<RosterMembership>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    private readonly trackPlaysService: TrackPlaysService,
    private readonly walletEarningsService: WalletEarningsService,
  ) {}

  async getOverview(organizationId: string): Promise<PublisherOverviewDto> {
    await this.assertPublisher(organizationId);
    const rosterIds = await this.getRosterUserIds(organizationId);

    if (!rosterIds.length) {
      return {
        songsPublished: 0,
        songsActive: 0,
        incomeGenerated: 0,
        currency: CURRENCY,
        totalPlays: 0,
        addedToPlaylists: 0,
        licenseRequestsReceived: 0,
        licensesSold: 0,
      };
    }

    const trackIds = await this.getRosterTrackIds(rosterIds);

    const [songsPublished, songsActive, incomeGenerated, playStats, addedToPlaylists, licenseRequestsReceived, licensesSold] =
      await Promise.all([
        this.countRosterTracks(rosterIds),
        this.countRosterTracks(rosterIds, true),
        this.sumRosterLicenseRevenue(rosterIds),
        this.trackPlaysService.getStatsForTracks(trackIds),
        this.countDistinctPlaylists(rosterIds),
        this.countRequests(rosterIds),
        this.countRequests(rosterIds, LicensePaymentStatus.APPROVED),
      ]);

    return {
      songsPublished,
      songsActive,
      incomeGenerated,
      currency: CURRENCY,
      totalPlays: playStats.totalPlays,
      addedToPlaylists,
      licenseRequestsReceived,
      licensesSold,
    };
  }

  async getSongDashboard(organizationId: string, trackId: string): Promise<SongDashboardDto> {
    await this.assertPublisher(organizationId);
    const rosterIds = await this.getRosterUserIds(organizationId);

    const track = rosterIds.length
      ? await this.trackRepo
          .createQueryBuilder('track')
          .innerJoin('track.authors', 'author', 'author.id IN (:...rosterIds)', { rosterIds })
          .where('track.id = :trackId', { trackId })
          .getOne()
      : null;

    if (!track) {
      const exists = await this.trackRepo.exists({ where: { id: trackId } });
      if (exists) throw new ForbiddenException('Esta canción no pertenece al roster de la organización.');
      throw new NotFoundException('Canción no encontrada.');
    }

    const [stats, playlists] = await Promise.all([
      this.trackPlaysService.getStatsForTrack(trackId),
      this.countPlaylistsForTrack(trackId),
    ]);

    return {
      trackId,
      title: track.title,
      plays: stats.totalPlays,
      uniqueListeners: stats.uniqueListeners,
      playlists,
    };
  }

  async getRightsIntelligence(organizationId: string): Promise<PublisherRightsIntelligenceDto> {
    await this.assertPublisher(organizationId);
    const members = await this.getRosterMembers(organizationId);
    const rosterIds = members.map((m) => m.userId);

    if (!rosterIds.length) {
      return {
        catalogUtilizationPct: 0,
        approvalRate: 0,
        requestsReceived: 0,
        topRequestedTracks: [],
        topGenres: [],
        topRhythms: [],
        topComposers: [],
        composerHighlight: null,
      };
    }

    const [totalPublished, tracksWithRequests, requestsReceived, approved, decided, topRequestedTracks, topGenres, topRhythms, composerIncome] =
      await Promise.all([
        this.countRosterTracks(rosterIds),
        this.countTracksWithRequests(rosterIds),
        this.countRequests(rosterIds),
        this.countRequestsByStatus(rosterIds, RequestsStatus.APROBADA),
        this.countDecidedRequests(rosterIds),
        this.getTopRequested(rosterIds, 'track.title'),
        this.getTopRequested(rosterIds, 'genre.name'),
        this.getTopRequested(rosterIds, 'track.ritmo'),
        this.getComposerIncome(members),
      ]);

    return {
      catalogUtilizationPct: this.pct(tracksWithRequests, totalPublished),
      approvalRate: this.pct(approved, decided),
      requestsReceived,
      topRequestedTracks,
      topGenres,
      topRhythms,
      topComposers: composerIncome.top,
      composerHighlight: composerIncome.highlight,
    };
  }

  async getRightsCompliance(organizationId: string): Promise<PublisherRightsComplianceDto> {
    await this.assertPublisher(organizationId);
    const rosterIds = await this.getRosterUserIds(organizationId);

    if (!rosterIds.length) {
      return {
        activeWorks: 0,
        inactiveWorks: 0,
        licensedWorks: 0,
        worksWithoutSplit: 0,
        worksWithoutRegistration: 0,
        privateWorks: 0,
        visibleWorks: 0,
        avgNegotiationDays: 0,
        closeRate: 0,
        avgLicenseValue: 0,
        currency: CURRENCY,
      };
    }

    const [
      totalPublished,
      activeWorks,
      licensedWorks,
      tracksWithCompletedSplit,
      tracksRegistered,
      avgNegotiationDays,
      requestsReceived,
      approved,
      avgLicenseValue,
    ] = await Promise.all([
      this.countRosterTracks(rosterIds),
      this.countRosterTracks(rosterIds, true),
      this.countLicensedWorks(rosterIds),
      this.countTracksWithCompletedSplit(rosterIds),
      this.countTracksRegistered(rosterIds),
      this.getAvgNegotiationDays(rosterIds),
      this.countRequests(rosterIds),
      this.countRequestsByStatus(rosterIds, RequestsStatus.APROBADA),
      this.getAvgLicenseValue(rosterIds),
    ]);

    const inactiveWorks = totalPublished - activeWorks;

    return {
      activeWorks,
      inactiveWorks,
      licensedWorks,
      worksWithoutSplit: totalPublished - tracksWithCompletedSplit,
      worksWithoutRegistration: totalPublished - tracksRegistered,
      // Derivado de isAvailable (decisión de producto): privada = no disponible.
      privateWorks: inactiveWorks,
      visibleWorks: activeWorks,
      avgNegotiationDays,
      closeRate: this.pct(approved, requestsReceived),
      avgLicenseValue,
      currency: CURRENCY,
    };
  }

  async getFinancial(organizationId: string): Promise<PublisherFinancialDto> {
    await this.assertPublisher(organizationId);
    const balance = await this.walletEarningsService.getOrganizationBalance(organizationId);

    const nextPayment = await this.getNextRosterPayment(organizationId);

    return {
      availableBalance: balance.availableBalance,
      pendingBalance: balance.totalReserved,
      totalEarned: balance.totalEarned,
      totalWithdrawn: balance.totalWithdrawnPaid,
      currency: balance.currency,
      nextPayment,
    };
  }

  // ─── Roster ──────────────────────────────────────────────────────────────

  private async getRosterMembers(organizationId: string): Promise<RosterMember[]> {
    const members = await this.rosterRepo.find({
      where: { organizationId, status: MembershipStatus.ACTIVE },
      relations: { user: true },
    });
    return members.map((m) => ({
      userId: m.userId,
      name: [m.user?.name, m.user?.lastName].filter(Boolean).join(' ').trim() || m.user?.email || m.userId,
    }));
  }

  private async getRosterUserIds(organizationId: string): Promise<string[]> {
    const members = await this.rosterRepo.find({
      where: { organizationId, status: MembershipStatus.ACTIVE },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  private async assertPublisher(organizationId: string): Promise<void> {
    const org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organización no encontrada.');
    if (org.type !== OrganizationType.PUBLISHER) {
      throw new BadRequestException('El dashboard de publisher solo aplica a organizaciones tipo PUBLISHER.');
    }
  }

  // ─── Helpers de agregación ───────────────────────────────────────────────

  private async getRosterTrackIds(rosterIds: string[]): Promise<string[]> {
    const rows = await this.trackRepo
      .createQueryBuilder('track')
      .select('track.id', 'id')
      .innerJoin('track.authors', 'author', 'author.id IN (:...rosterIds)', { rosterIds })
      .groupBy('track.id')
      .getRawMany<{ id: string }>();
    return rows.map((r) => r.id);
  }

  private countRosterTracks(rosterIds: string[], onlyActive = false): Promise<number> {
    const qb = this.trackRepo
      .createQueryBuilder('track')
      .innerJoin('track.authors', 'author', 'author.id IN (:...rosterIds)', { rosterIds });
    if (onlyActive) qb.andWhere('track.is_available = true');
    // Un track puede tener varios autores del roster; contamos tracks distintos.
    return qb.select('COUNT(DISTINCT track.id)', 'c').getRawOne<{ c: string }>().then((r) => Number(r?.c ?? 0));
  }

  /** Valor bruto licenciado por el catálogo del roster (licencias aprobadas). */
  private async sumRosterLicenseRevenue(rosterIds: string[]): Promise<number> {
    const raw = await this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.owner', 'owner', 'owner.id IN (:...rosterIds)', { rosterIds })
      .where('rt.license_payment_status = :approved', { approved: LicensePaymentStatus.APPROVED })
      .andWhere('rt.license_price IS NOT NULL')
      .select('COALESCE(SUM(rt.license_price), 0)', 'total')
      .getRawOne<{ total: string }>();
    return Number(raw?.total ?? 0);
  }

  private async countDistinctPlaylists(rosterIds: string[]): Promise<number> {
    const raw = await this.trackRepo
      .createQueryBuilder('track')
      .innerJoin('track.authors', 'author', 'author.id IN (:...rosterIds)', { rosterIds })
      .innerJoin('track.playlists', 'playlist')
      .select('COUNT(DISTINCT playlist.id)', 'c')
      .getRawOne<{ c: string }>();
    return Number(raw?.c ?? 0);
  }

  private async countPlaylistsForTrack(trackId: string): Promise<number> {
    const raw = await this.trackRepo
      .createQueryBuilder('track')
      .innerJoin('track.playlists', 'playlist')
      .where('track.id = :trackId', { trackId })
      .select('COUNT(DISTINCT playlist.id)', 'c')
      .getRawOne<{ c: string }>();
    return Number(raw?.c ?? 0);
  }

  private countRequests(rosterIds: string[], paymentStatus?: LicensePaymentStatus): Promise<number> {
    const qb = this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.owner', 'owner', 'owner.id IN (:...rosterIds)', { rosterIds });
    if (paymentStatus) qb.andWhere('rt.license_payment_status = :paymentStatus', { paymentStatus });
    return qb.getCount();
  }

  private countRequestsByStatus(rosterIds: string[], status: RequestsStatus): Promise<number> {
    return this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.owner', 'owner', 'owner.id IN (:...rosterIds)', { rosterIds })
      .andWhere('rt.status = :status', { status })
      .getCount();
  }

  private countDecidedRequests(rosterIds: string[]): Promise<number> {
    return this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.owner', 'owner', 'owner.id IN (:...rosterIds)', { rosterIds })
      .andWhere('rt.status IN (:...statuses)', {
        statuses: [RequestsStatus.APROBADA, RequestsStatus.RECHAZADA],
      })
      .getCount();
  }

  private async countTracksWithRequests(rosterIds: string[]): Promise<number> {
    const raw = await this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.owner', 'owner', 'owner.id IN (:...rosterIds)', { rosterIds })
      .select('COUNT(DISTINCT rt.track_id)', 'c')
      .getRawOne<{ c: string }>();
    return Number(raw?.c ?? 0);
  }

  private async countLicensedWorks(rosterIds: string[]): Promise<number> {
    const raw = await this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.owner', 'owner', 'owner.id IN (:...rosterIds)', { rosterIds })
      .where('rt.license_payment_status = :approved', { approved: LicensePaymentStatus.APPROVED })
      .select('COUNT(DISTINCT rt.track_id)', 'c')
      .getRawOne<{ c: string }>();
    return Number(raw?.c ?? 0);
  }

  private async countTracksWithCompletedSplit(rosterIds: string[]): Promise<number> {
    const raw = await this.trackRepo
      .createQueryBuilder('track')
      .innerJoin('track.authors', 'author', 'author.id IN (:...rosterIds)', { rosterIds })
      .innerJoin(Split, 'split', 'split.track_id = track.id AND split.status = :status', {
        status: SplitStatus.COMPLETED,
      })
      .select('COUNT(DISTINCT track.id)', 'c')
      .getRawOne<{ c: string }>();
    return Number(raw?.c ?? 0);
  }

  private async countTracksRegistered(rosterIds: string[]): Promise<number> {
    const raw = await this.trackRepo
      .createQueryBuilder('track')
      .innerJoin('track.authors', 'author', 'author.id IN (:...rosterIds)', { rosterIds })
      .innerJoin(RegistrationFile, 'rf', 'rf.track_id = track.id AND rf.status = :status', {
        status: RegistrationFileStatus.LISTO_PARA_PRESENTAR,
      })
      .select('COUNT(DISTINCT track.id)', 'c')
      .getRawOne<{ c: string }>();
    return Number(raw?.c ?? 0);
  }

  private async getAvgNegotiationDays(rosterIds: string[]): Promise<number> {
    const raw = await this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.owner', 'owner', 'owner.id IN (:...rosterIds)', { rosterIds })
      .andWhere('rt.status IN (:...statuses)', {
        statuses: [RequestsStatus.APROBADA, RequestsStatus.RECHAZADA],
      })
      .select('AVG(EXTRACT(EPOCH FROM (rt.updated_at - rt.created_at)) / 86400)', 'avg')
      .getRawOne<{ avg: string | null }>();
    return Math.round(Number(raw?.avg ?? 0));
  }

  private async getAvgLicenseValue(rosterIds: string[]): Promise<number> {
    const raw = await this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.owner', 'owner', 'owner.id IN (:...rosterIds)', { rosterIds })
      .where('rt.license_payment_status = :approved', { approved: LicensePaymentStatus.APPROVED })
      .andWhere('rt.license_price IS NOT NULL')
      .select('COALESCE(AVG(rt.license_price), 0)', 'avg')
      .getRawOne<{ avg: string }>();
    return Math.round(Number(raw?.avg ?? 0));
  }

  private async getTopRequested(rosterIds: string[], labelExpr: string): Promise<RankedItemDto[]> {
    const rows = await this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.owner', 'owner', 'owner.id IN (:...rosterIds)', { rosterIds })
      .innerJoin('rt.track', 'track')
      .leftJoin('track.genre', 'genre')
      .select(`${labelExpr}`, 'label')
      .addSelect('COUNT(rt.id)', 'count')
      .where(`${labelExpr} IS NOT NULL`)
      .groupBy('label')
      .orderBy('count', 'DESC')
      .limit(TOP_LIMIT)
      .getRawMany<{ label: string; count: string }>();
    return rows.map((r) => ({ label: r.label, count: Number(r.count) }));
  }

  /**
   * Ingresos por compositor del roster (roles OWN/COAUTHOR, sin comisiones de
   * publisher) y el compositor que más se destaca frente al promedio del roster.
   */
  private async getComposerIncome(
    members: RosterMember[],
  ): Promise<{ top: ComposerIncomeDto[]; highlight: PublisherRightsIntelligenceDto['composerHighlight'] }> {
    const rosterIds = members.map((m) => m.userId);
    const rows = await this.earningRepo
      .createQueryBuilder('earning')
      .select('earning.beneficiary_user_id', 'userId')
      .addSelect('COALESCE(SUM(earning.amount), 0)', 'income')
      .where('earning.beneficiary_user_id IN (:...rosterIds)', { rosterIds })
      .andWhere('earning.role IN (:...roles)', {
        roles: [WalletEarningRole.OWN, WalletEarningRole.COAUTHOR],
      })
      .groupBy('earning.beneficiary_user_id')
      .getRawMany<{ userId: string; income: string }>();

    const nameByUser = new Map(members.map((m) => [m.userId, m.name]));
    const incomes = rows
      .map((r) => ({ userId: r.userId, name: nameByUser.get(r.userId) ?? r.userId, income: Number(r.income) }))
      .filter((c) => c.income > 0)
      .sort((a, b) => b.income - a.income);

    const top = incomes.slice(0, TOP_LIMIT);

    let highlight: PublisherRightsIntelligenceDto['composerHighlight'] = null;
    if (incomes.length >= 2) {
      const total = incomes.reduce((acc, c) => acc + c.income, 0);
      const average = total / incomes.length;
      const leader = incomes[0];
      if (average > 0) {
        const multiple = Math.round((leader.income / average) * 10) / 10;
        if (multiple >= 2) {
          highlight = { name: leader.name, multiple };
        }
      }
    }

    return { top, highlight };
  }

  private async getNextRosterPayment(organizationId: string): Promise<NextPaymentDto | null> {
    const rosterIds = await this.getRosterUserIds(organizationId);
    if (!rosterIds.length) return null;

    const nextCollection = await this.collectionRepo
      .createQueryBuilder('collection')
      .innerJoinAndSelect('collection.requestedTrack', 'rt')
      .innerJoin('rt.owner', 'owner', 'owner.id IN (:...rosterIds)', { rosterIds })
      .innerJoinAndSelect('rt.track', 'track')
      .where('collection.status != :paid', { paid: CollectionStatus.PAGADO })
      .orderBy('collection.due_date', 'ASC')
      .getOne();

    if (!nextCollection) return null;

    return {
      amount: Number(nextCollection.amount),
      dueDate: nextCollection.dueDate.toISOString(),
      trackTitle: nextCollection.requestedTrack?.track?.title ?? '',
    };
  }

  private pct(part: number, total: number): number {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  }
}
