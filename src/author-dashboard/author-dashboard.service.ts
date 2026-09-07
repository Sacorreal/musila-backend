import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Track } from 'src/tracks/entities/track.entity';
import { TrackPlaysService } from 'src/tracks/track-plays.service';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { RequestsStatus } from 'src/requested-tracks/entities/requests-status.enum';
import { LicensePaymentStatus } from 'src/requested-tracks/entities/license-payment-status.enum';
import { WalletEarning } from 'src/wallet/entities/wallet-earning.entity';
import { WalletEarningsService } from 'src/wallet/services/wallet-earnings.service';
import { LicenseCollection } from 'src/license-collections/entities/license-collection.entity';
import { CollectionStatus } from 'src/license-collections/entities/collection-status.enum';
import { Split } from 'src/splits/entities/split.entity';
import { SplitStatus } from 'src/splits/entities/split-status.enum';
import { RegistrationFile } from 'src/registration-file/entities/registration-file.entity';
import { RegistrationFileStatus } from 'src/registration-file/entities/registration-file-status.enum';
import {
  AuthorFinancialDto,
  AuthorOverviewDto,
  RankedItemDto,
  RightsComplianceDto,
  RightsIntelligenceDto,
  SongDashboardDto,
} from './dto/author-dashboard-response.dto';

const CURRENCY = 'COP';
const TOP_LIMIT = 5;

/**
 * Servicio de solo lectura que agrega las métricas de los dashboards del autor
 * reutilizando los repositorios existentes. Todas las consultas se filtran por
 * el autor autenticado: catálogo por la relación `Track.authors`; solicitudes,
 * licencias y cobros por `RequestedTrack.owner` (quien recibe la solicitud).
 */
@Injectable()
export class AuthorDashboardService {
  constructor(
    @InjectRepository(Track)
    private readonly trackRepo: Repository<Track>,
    @InjectRepository(RequestedTrack)
    private readonly requestedTrackRepo: Repository<RequestedTrack>,
    @InjectRepository(WalletEarning)
    private readonly earningRepo: Repository<WalletEarning>,
    @InjectRepository(LicenseCollection)
    private readonly collectionRepo: Repository<LicenseCollection>,
    private readonly trackPlaysService: TrackPlaysService,
    private readonly walletEarningsService: WalletEarningsService,
  ) {}

  async getOverview(userId: string): Promise<AuthorOverviewDto> {
    const trackIds = await this.getAuthorTrackIds(userId);

    const [songsPublished, songsActive, incomeGenerated, playStats, addedToPlaylists, licenseRequestsReceived, licensesSold] =
      await Promise.all([
        this.countAuthorTracks(userId),
        this.countAuthorTracks(userId, true),
        this.sumAuthorEarnings(userId),
        this.trackPlaysService.getStatsForTracks(trackIds),
        this.countDistinctPlaylists(userId),
        this.countRequests(userId),
        this.countRequests(userId, LicensePaymentStatus.APPROVED),
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

  async getSongDashboard(userId: string, trackId: string): Promise<SongDashboardDto> {
    const track = await this.trackRepo
      .createQueryBuilder('track')
      .innerJoin('track.authors', 'author', 'author.id = :userId', { userId })
      .where('track.id = :trackId', { trackId })
      .getOne();

    if (!track) {
      const exists = await this.trackRepo.exists({ where: { id: trackId } });
      if (exists) throw new ForbiddenException('No tienes acceso a las métricas de esta canción.');
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

  async getRightsIntelligence(userId: string): Promise<RightsIntelligenceDto> {
    const [totalPublished, tracksWithRequests, requestsReceived, approved, decided, topRequestedTracks, topGenres, topRhythms] =
      await Promise.all([
        this.countAuthorTracks(userId),
        this.countTracksWithRequests(userId),
        this.countRequests(userId),
        this.countRequestsByStatus(userId, RequestsStatus.APROBADA),
        this.countDecidedRequests(userId),
        this.getTopRequested(userId, 'track.title'),
        this.getTopRequested(userId, 'genre.name'),
        this.getTopRequested(userId, 'track.ritmo'),
      ]);

    return {
      catalogUtilizationPct: this.pct(tracksWithRequests, totalPublished),
      approvalRate: this.pct(approved, decided),
      requestsReceived,
      topRequestedTracks,
      topGenres,
      topRhythms,
    };
  }

  async getRightsCompliance(userId: string): Promise<RightsComplianceDto> {
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
      this.countAuthorTracks(userId),
      this.countAuthorTracks(userId, true),
      this.countLicensedWorks(userId),
      this.countTracksWithCompletedSplit(userId),
      this.countTracksRegistered(userId),
      this.getAvgNegotiationDays(userId),
      this.countRequests(userId),
      this.countRequestsByStatus(userId, RequestsStatus.APROBADA),
      this.getAvgLicenseValue(userId),
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

  async getFinancial(userId: string): Promise<AuthorFinancialDto> {
    const balance = await this.walletEarningsService.getBalance(userId);

    const nextCollection = await this.collectionRepo
      .createQueryBuilder('collection')
      .innerJoinAndSelect('collection.requestedTrack', 'rt')
      .innerJoin('rt.owner', 'owner', 'owner.id = :userId', { userId })
      .innerJoinAndSelect('rt.track', 'track')
      .where('collection.status != :paid', { paid: CollectionStatus.PAGADO })
      .orderBy('collection.due_date', 'ASC')
      .getOne();

    let nextPayment: AuthorFinancialDto['nextPayment'] = null;
    if (nextCollection) {
      nextPayment = {
        amount: Number(nextCollection.amount),
        dueDate: nextCollection.dueDate.toISOString(),
        trackTitle: nextCollection.requestedTrack?.track?.title ?? '',
      };
    }

    return {
      availableBalance: balance.availableBalance,
      pendingBalance: balance.totalReserved,
      totalEarned: balance.totalEarned,
      totalWithdrawn: balance.totalWithdrawnPaid,
      currency: balance.currency,
      nextPayment,
    };
  }

  // ─── Helpers de agregación ───────────────────────────────────────────────

  private async getAuthorTrackIds(userId: string): Promise<string[]> {
    const rows = await this.trackRepo
      .createQueryBuilder('track')
      .select('track.id', 'id')
      .innerJoin('track.authors', 'author', 'author.id = :userId', { userId })
      .getRawMany<{ id: string }>();
    return rows.map((r) => r.id);
  }

  private countAuthorTracks(userId: string, onlyActive = false): Promise<number> {
    const qb = this.trackRepo
      .createQueryBuilder('track')
      .innerJoin('track.authors', 'author', 'author.id = :userId', { userId });
    if (onlyActive) qb.andWhere('track.is_available = true');
    return qb.getCount();
  }

  private async sumAuthorEarnings(userId: string): Promise<number> {
    const raw = await this.earningRepo
      .createQueryBuilder('earning')
      .select('COALESCE(SUM(earning.amount), 0)', 'total')
      .where('earning.beneficiary_user_id = :userId', { userId })
      .getRawOne<{ total: string }>();
    return Number(raw?.total ?? 0);
  }

  private async countDistinctPlaylists(userId: string): Promise<number> {
    const raw = await this.trackRepo
      .createQueryBuilder('track')
      .innerJoin('track.authors', 'author', 'author.id = :userId', { userId })
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

  private countRequests(userId: string, paymentStatus?: LicensePaymentStatus): Promise<number> {
    const qb = this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.owner', 'owner', 'owner.id = :userId', { userId });
    if (paymentStatus) qb.andWhere('rt.license_payment_status = :paymentStatus', { paymentStatus });
    return qb.getCount();
  }

  private countRequestsByStatus(userId: string, status: RequestsStatus): Promise<number> {
    return this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.owner', 'owner', 'owner.id = :userId', { userId })
      .andWhere('rt.status = :status', { status })
      .getCount();
  }

  private countDecidedRequests(userId: string): Promise<number> {
    return this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.owner', 'owner', 'owner.id = :userId', { userId })
      .andWhere('rt.status IN (:...statuses)', {
        statuses: [RequestsStatus.APROBADA, RequestsStatus.RECHAZADA],
      })
      .getCount();
  }

  private async countTracksWithRequests(userId: string): Promise<number> {
    const raw = await this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.owner', 'owner', 'owner.id = :userId', { userId })
      .select('COUNT(DISTINCT rt.track_id)', 'c')
      .getRawOne<{ c: string }>();
    return Number(raw?.c ?? 0);
  }

  private async countLicensedWorks(userId: string): Promise<number> {
    const raw = await this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.owner', 'owner', 'owner.id = :userId', { userId })
      .where('rt.license_payment_status = :approved', { approved: LicensePaymentStatus.APPROVED })
      .select('COUNT(DISTINCT rt.track_id)', 'c')
      .getRawOne<{ c: string }>();
    return Number(raw?.c ?? 0);
  }

  private async countTracksWithCompletedSplit(userId: string): Promise<number> {
    const raw = await this.trackRepo
      .createQueryBuilder('track')
      .innerJoin('track.authors', 'author', 'author.id = :userId', { userId })
      .innerJoin(Split, 'split', 'split.track_id = track.id AND split.status = :status', {
        status: SplitStatus.COMPLETED,
      })
      .select('COUNT(DISTINCT track.id)', 'c')
      .getRawOne<{ c: string }>();
    return Number(raw?.c ?? 0);
  }

  private async countTracksRegistered(userId: string): Promise<number> {
    const raw = await this.trackRepo
      .createQueryBuilder('track')
      .innerJoin('track.authors', 'author', 'author.id = :userId', { userId })
      .innerJoin(RegistrationFile, 'rf', 'rf.track_id = track.id AND rf.status = :status', {
        status: RegistrationFileStatus.LISTO_PARA_PRESENTAR,
      })
      .select('COUNT(DISTINCT track.id)', 'c')
      .getRawOne<{ c: string }>();
    return Number(raw?.c ?? 0);
  }

  private async getAvgNegotiationDays(userId: string): Promise<number> {
    const raw = await this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.owner', 'owner', 'owner.id = :userId', { userId })
      .andWhere('rt.status IN (:...statuses)', {
        statuses: [RequestsStatus.APROBADA, RequestsStatus.RECHAZADA],
      })
      .select('AVG(EXTRACT(EPOCH FROM (rt.updated_at - rt.created_at)) / 86400)', 'avg')
      .getRawOne<{ avg: string | null }>();
    return Math.round(Number(raw?.avg ?? 0));
  }

  private async getAvgLicenseValue(userId: string): Promise<number> {
    const raw = await this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.owner', 'owner', 'owner.id = :userId', { userId })
      .where('rt.license_payment_status = :approved', { approved: LicensePaymentStatus.APPROVED })
      .andWhere('rt.license_price IS NOT NULL')
      .select('COALESCE(AVG(rt.license_price), 0)', 'avg')
      .getRawOne<{ avg: string }>();
    return Math.round(Number(raw?.avg ?? 0));
  }

  private async getTopRequested(userId: string, labelExpr: string): Promise<RankedItemDto[]> {
    const rows = await this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.owner', 'owner', 'owner.id = :userId', { userId })
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

  private pct(part: number, total: number): number {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  }
}
