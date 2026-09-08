import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { RequestsStatus } from 'src/requested-tracks/entities/requests-status.enum';
import { RosterMembership } from 'src/organizations/entities/roster-membership.entity';
import { MembershipStatus } from 'src/organizations/entities/membership-status.enum';
import { DateRange, TrackPlaysService } from 'src/tracks/track-plays.service';
import {
  BuyerActiveMemberDto,
  BuyerDashboardLicensesResponseDto,
  BuyerLicensedTrackRowDto,
  BuyerMonthlyLicenseTrendPointDto,
  BuyerOverviewDto,
  BuyerRankedTrackDto,
} from './dto/buyer-dashboard-response.dto';

const CURRENCY = 'COP';
const TREND_MONTHS = 6;

interface RosterMember {
  userId: string;
  name: string;
}

interface MonthRange {
  from: Date;
  to: Date;
  label: string;
}

/**
 * Servicio de solo lectura que agrega las métricas del dashboard del lado
 * comprador del marketplace: organizaciones (LABEL, MANAGEMENT, AGENCY,
 * MUSIC_LIBRARY, OTHER) cuyo roster ACTIVE de artistas gestionados escucha y
 * licencia canciones de otros autores. Es el espejo de
 * `PublisherDashboardService` filtrando por `RequestedTrack.requester` en vez
 * de `RequestedTrack.owner`, y por oyentes (`TrackPlay.user`) en vez de
 * tracks propios.
 */
@Injectable()
export class BuyerDashboardService {
  constructor(
    @InjectRepository(RequestedTrack)
    private readonly requestedTrackRepo: Repository<RequestedTrack>,
    @InjectRepository(RosterMembership)
    private readonly rosterRepo: Repository<RosterMembership>,
    private readonly trackPlaysService: TrackPlaysService,
  ) {}

  async getOverview(organizationId: string): Promise<BuyerOverviewDto> {
    const rosterMembers = await this.getRosterMembers(organizationId);
    const rosterIds = rosterMembers.map((m) => m.userId);

    if (!rosterIds.length) {
      return {
        playsThisMonth: 0,
        playsLastMonth: 0,
        playsChangePct: 0,
        licensesThisMonth: 0,
        licensesLastMonth: 0,
        licensesChangePct: 0,
        licensedValueThisMonth: 0,
        currency: CURRENCY,
        activeRosterMembers: 0,
        topTrackThisMonth: null,
        mostActiveRosterMember: null,
        monthlyLicenseTrend: [],
      };
    }

    const currentRange = this.resolveMonthRange();
    const previousRange = this.getPreviousMonthRange(currentRange);

    const [
      currentPlayStats,
      previousPlayStats,
      licensesThisMonth,
      licensesLastMonth,
      licensedValueThisMonth,
      topTracks,
      mostActiveListener,
      monthlyLicenseTrend,
      activeRosterMembers,
    ] = await Promise.all([
      this.trackPlaysService.getStatsForListeners(rosterIds, currentRange),
      this.trackPlaysService.getStatsForListeners(rosterIds, previousRange),
      this.countApprovedLicenses(rosterIds, currentRange),
      this.countApprovedLicenses(rosterIds, previousRange),
      this.sumApprovedLicenseValue(rosterIds, currentRange),
      this.trackPlaysService.getTopTracksForListeners(rosterIds, currentRange, 1),
      this.trackPlaysService.getMostActiveListener(rosterIds, currentRange),
      this.getMonthlyLicenseTrend(rosterIds, TREND_MONTHS),
      this.rosterRepo.count({ where: { organizationId, status: MembershipStatus.ACTIVE } }),
    ]);

    const nameByUserId = new Map(rosterMembers.map((m) => [m.userId, m.name]));

    const topTrackThisMonth: BuyerRankedTrackDto | null = topTracks[0]
      ? { trackId: topTracks[0].trackId, title: topTracks[0].title, plays: topTracks[0].plays }
      : null;

    const mostActiveRosterMember: BuyerActiveMemberDto | null = mostActiveListener
      ? {
          userId: mostActiveListener.userId,
          name: nameByUserId.get(mostActiveListener.userId) ?? mostActiveListener.userId,
          plays: mostActiveListener.plays,
        }
      : null;

    return {
      playsThisMonth: currentPlayStats.totalPlays,
      playsLastMonth: previousPlayStats.totalPlays,
      playsChangePct: this.changePct(currentPlayStats.totalPlays, previousPlayStats.totalPlays),
      licensesThisMonth,
      licensesLastMonth,
      licensesChangePct: this.changePct(licensesThisMonth, licensesLastMonth),
      licensedValueThisMonth,
      currency: CURRENCY,
      activeRosterMembers,
      topTrackThisMonth,
      mostActiveRosterMember,
      monthlyLicenseTrend,
    };
  }

  async getLicenses(organizationId: string, month?: string): Promise<BuyerDashboardLicensesResponseDto> {
    const rosterIds = await this.getRosterUserIds(organizationId);
    const range = this.resolveMonthRange(month);

    if (!rosterIds.length) {
      return { month: range.label, total: 0, data: [] };
    }

    const data = await this.getLicensedTrackRows(rosterIds, range);
    return { month: range.label, total: data.length, data };
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

  // ─── Rango de fechas ─────────────────────────────────────────────────────

  /**
   * Resuelve el rango del mes calendario a consultar. Si `month` ('YYYY-MM')
   * no viene, usa el mes calendario actual. Usa `Date` nativo (sin librerías
   * de fechas, el backend no las tiene) en UTC para evitar ambigüedad de zona
   * horaria.
   */
  private resolveMonthRange(month?: string): MonthRange {
    let year: number;
    let monthIndex: number;

    if (month) {
      const [y, m] = month.split('-').map(Number);
      year = y;
      monthIndex = m - 1;
    } else {
      const now = new Date();
      year = now.getUTCFullYear();
      monthIndex = now.getUTCMonth();
    }

    return this.buildMonthRange(year, monthIndex);
  }

  /** El mes calendario inmediatamente anterior al `from` de `range`. */
  private getPreviousMonthRange(range: MonthRange): MonthRange {
    return this.buildMonthRange(range.from.getUTCFullYear(), range.from.getUTCMonth() - 1);
  }

  private buildMonthRange(year: number, monthIndex: number): MonthRange {
    const from = new Date(Date.UTC(year, monthIndex, 1));
    const to = new Date(Date.UTC(year, monthIndex + 1, 1));
    return { from, to, label: this.toMonthLabel(from) };
  }

  private toMonthLabel(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * % de cambio de `current` respecto a `previous`. Nota: cuando
   * `previous === 0` retorna 0 sin distinguir "sin dato previo" (nunca hubo
   * actividad el período anterior) de "sin cambio" — limitación conocida,
   * consistente con el resto de los % del dashboard.
   */
  private changePct(current: number, previous: number): number {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  // ─── Helpers de agregación ───────────────────────────────────────────────

  private countApprovedLicenses(requesterIds: string[], range: DateRange): Promise<number> {
    return this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.requester', 'requester', 'requester.id IN (:...requesterIds)', { requesterIds })
      .where('rt.status = :aprobada', { aprobada: RequestsStatus.APROBADA })
      .andWhere('rt.updated_at >= :from AND rt.updated_at < :to', { from: range.from, to: range.to })
      .getCount();
  }

  private async sumApprovedLicenseValue(requesterIds: string[], range: DateRange): Promise<number> {
    const raw = await this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.requester', 'requester', 'requester.id IN (:...requesterIds)', { requesterIds })
      .where('rt.status = :aprobada', { aprobada: RequestsStatus.APROBADA })
      .andWhere('rt.updated_at >= :from AND rt.updated_at < :to', { from: range.from, to: range.to })
      .andWhere('rt.license_price IS NOT NULL')
      .select('COALESCE(SUM(rt.license_price), 0)', 'total')
      .getRawOne<{ total: string }>();
    return Number(raw?.total ?? 0);
  }

  /**
   * Serie mensual de licencias aprobadas de los últimos `months` meses
   * (incluido el actual), en una sola query agregada. Los meses sin filas en
   * el resultado se rellenan con `count: 0` para que el chart siempre tenga
   * la serie completa.
   */
  private async getMonthlyLicenseTrend(
    requesterIds: string[],
    months = TREND_MONTHS,
  ): Promise<BuyerMonthlyLicenseTrendPointDto[]> {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonthIndex = now.getUTCMonth();
    const since = new Date(Date.UTC(currentYear, currentMonthIndex - (months - 1), 1));

    const rows = await this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.requester', 'requester', 'requester.id IN (:...requesterIds)', { requesterIds })
      .where('rt.status = :aprobada', { aprobada: RequestsStatus.APROBADA })
      .andWhere('rt.updated_at >= :since', { since })
      .select("DATE_TRUNC('month', rt.updated_at)", 'month')
      .addSelect('COUNT(*)', 'count')
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany<{ month: Date | string; count: string }>();

    const countByMonth = new Map(rows.map((r) => [this.toMonthLabel(new Date(r.month)), Number(r.count)]));

    const points: BuyerMonthlyLicenseTrendPointDto[] = [];
    for (let i = 0; i < months; i++) {
      const pointDate = new Date(Date.UTC(currentYear, currentMonthIndex - (months - 1) + i, 1));
      const label = this.toMonthLabel(pointDate);
      points.push({ month: label, count: countByMonth.get(label) ?? 0 });
    }
    return points;
  }

  private async getLicensedTrackRows(
    requesterIds: string[],
    range: DateRange,
  ): Promise<BuyerLicensedTrackRowDto[]> {
    const rows = await this.requestedTrackRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.requester', 'requester', 'requester.id IN (:...requesterIds)', { requesterIds })
      .innerJoin('rt.owner', 'owner')
      .innerJoin('rt.track', 'track')
      .where('rt.status = :aprobada', { aprobada: RequestsStatus.APROBADA })
      .andWhere('rt.updated_at >= :from AND rt.updated_at < :to', { from: range.from, to: range.to })
      .select('rt.id', 'requestId')
      .addSelect('track.id', 'trackId')
      .addSelect('track.title', 'trackTitle')
      .addSelect('owner.id', 'ownerId')
      .addSelect('owner.name', 'ownerFirstName')
      .addSelect('owner.last_name', 'ownerLastName')
      .addSelect('owner.email', 'ownerEmail')
      .addSelect('requester.id', 'requesterId')
      .addSelect('requester.name', 'requesterFirstName')
      .addSelect('requester.last_name', 'requesterLastName')
      .addSelect('requester.email', 'requesterEmail')
      .addSelect('rt.licenseType', 'licenseType')
      .addSelect('rt.license_price', 'licensePrice')
      .addSelect('rt.license_payment_status', 'licensePaymentStatus')
      .addSelect('rt.updated_at', 'approvedAt')
      .addSelect('rt.created_at', 'createdAt')
      .orderBy('rt.updated_at', 'DESC')
      .getRawMany<{
        requestId: string;
        trackId: string;
        trackTitle: string;
        ownerId: string;
        ownerFirstName: string | null;
        ownerLastName: string | null;
        ownerEmail: string | null;
        requesterId: string;
        requesterFirstName: string | null;
        requesterLastName: string | null;
        requesterEmail: string | null;
        licenseType: string;
        licensePrice: string | null;
        licensePaymentStatus: string;
        approvedAt: Date | string;
        createdAt: Date | string;
      }>();

    return rows.map((r) => ({
      requestId: r.requestId,
      trackId: r.trackId,
      trackTitle: r.trackTitle,
      ownerName: this.composeName(r.ownerFirstName, r.ownerLastName, r.ownerEmail, r.ownerId),
      requesterId: r.requesterId,
      requesterName: this.composeName(r.requesterFirstName, r.requesterLastName, r.requesterEmail, r.requesterId),
      licenseType: r.licenseType,
      licensePrice: r.licensePrice !== null ? Number(r.licensePrice) : null,
      currency: CURRENCY,
      licensePaymentStatus: r.licensePaymentStatus,
      approvedAt: new Date(r.approvedAt).toISOString(),
      createdAt: new Date(r.createdAt).toISOString(),
    }));
  }

  /** Mismo criterio de nombre que `getRosterMembers`, aplicado a un raw row. */
  private composeName(
    firstName: string | null,
    lastName: string | null,
    email: string | null,
    fallbackId: string,
  ): string {
    return [firstName, lastName].filter(Boolean).join(' ').trim() || email || fallbackId;
  }
}
