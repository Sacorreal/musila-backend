import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletEarning } from '../entities/wallet-earning.entity';
import { WalletEarningRole } from '../entities/wallet-earning-role.enum';
import { WalletDistributionSource } from '../entities/wallet-distribution-source.enum';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { LicenseContract } from 'src/license-contracts/entities/license-contract.entity';
import { commissionCentsFor, fromCents, toCents } from 'src/commission/money.util';
import { WalletDistributionService, ResolvedDistribution } from './wallet-distribution.service';
import { WalletWithdrawal } from '../entities/wallet-withdrawal.entity';
import { WalletWithdrawalStatus } from '../entities/wallet-withdrawal-status.enum';
import { EarningsPaginationDto } from '../dto/earnings-pagination.dto';

export interface WalletBalance {
  totalEarnedOwn: number;
  totalEarnedCoauthor: number;
  totalEarned: number;
  totalWithdrawnPaid: number;
  totalReserved: number;
  availableBalance: number;
  currency: string;
}

@Injectable()
export class WalletEarningsService {
  private readonly logger = new Logger(WalletEarningsService.name);

  constructor(
    @InjectRepository(WalletEarning)
    private readonly earningRepo: Repository<WalletEarning>,
    @InjectRepository(WalletWithdrawal)
    private readonly withdrawalRepo: Repository<WalletWithdrawal>,
    @InjectRepository(LicenseContract)
    private readonly licenseContractRepo: Repository<LicenseContract>,
    private readonly distributionService: WalletDistributionService,
  ) {}

  /**
   * Acredita el pago único de una licencia (`RequestedTrack.licensePrice`).
   * Si el track tiene un `LicenseContract`, el dinero se mueve por cuotas
   * (`creditFromInstallment`) y este evento se ignora para evitar doble conteo.
   */
  async creditFromLicensePayment(requestedTrackId: string): Promise<void> {
    const existingContract = await this.licenseContractRepo.findOne({
      where: { requestedTrack: { id: requestedTrackId } },
    });
    if (existingContract) {
      this.logger.debug(
        `[Wallet] requestedTrack=${requestedTrackId} tiene LicenseContract, se ignora track.request.license.approved`,
      );
      return;
    }

    const distribution = await this.distributionService.resolveDistribution(requestedTrackId);
    const grossAmount = Number(distribution.requestedTrack.licensePrice ?? 0);
    if (grossAmount <= 0) {
      this.logger.warn(`[Wallet] requestedTrack=${requestedTrackId} sin licensePrice válido, no se acredita`);
      return;
    }

    await this.creditDistribution({
      distribution,
      grossAmount,
      sourceReference: `license:${requestedTrackId}`,
      occurredAt: new Date(),
      licenseContractId: null,
      licenseCollectionId: null,
    });
  }

  /** Acredita una cuota de anticipo pagada (`LicenseCollection`). */
  async creditFromInstallment(payload: {
    collectionId: string;
    requestedTrackId: string;
    licenseContractId: string | null;
    amount: number;
    paidAt: Date;
  }): Promise<void> {
    const distribution = await this.distributionService.resolveDistribution(payload.requestedTrackId, {
      licenseContractId: payload.licenseContractId,
    });

    await this.creditDistribution({
      distribution,
      grossAmount: payload.amount,
      sourceReference: `collection:${payload.collectionId}`,
      occurredAt: payload.paidAt,
      licenseContractId: payload.licenseContractId,
      licenseCollectionId: payload.collectionId,
    });
  }

  private async creditDistribution(params: {
    distribution: ResolvedDistribution;
    grossAmount: number;
    sourceReference: string;
    occurredAt: Date;
    licenseContractId: string | null;
    licenseCollectionId: string | null;
  }): Promise<void> {
    const { distribution, grossAmount, sourceReference, occurredAt, licenseContractId, licenseCollectionId } = params;
    const { requestedTrack, entries, source } = distribution;

    const grossCents = toCents(grossAmount);
    const commissionCentsByOrg = this.resolvePublisherCommission(requestedTrack, entries, grossCents, sourceReference);
    const totalCommissionCents = [...commissionCentsByOrg.values()].reduce((acc, cents) => acc + cents, 0);
    const netCents = grossCents - totalCommissionCents;

    // Vendedores: reciben su split% del NETO (la comisión de publisher se
    // descuenta prorrateada entre todos los que reciben).
    for (const entry of entries) {
      const amountCents = Math.round((netCents * entry.percentage) / 100);
      await this.saveEarning({
        beneficiary: { id: entry.userId },
        beneficiaryOrganization: null,
        requestedTrack,
        licenseContractId,
        licenseCollectionId,
        role: entry.userId === requestedTrack.owner.id ? WalletEarningRole.OWN : WalletEarningRole.COAUTHOR,
        distributionSource: source,
        grossAmount,
        percentage: entry.percentage,
        amount: fromCents(amountCents),
        sourceReference,
        occurredAt,
        logLabel: `beneficiario=${entry.userId}`,
      });
    }

    // Publishers: comisión acreditada a la wallet de la organización.
    for (const [organizationId, cents] of commissionCentsByOrg) {
      if (cents <= 0) continue;
      const effectivePercentage = Math.round((cents / grossCents) * 10000) / 100;
      await this.saveEarning({
        beneficiary: null,
        beneficiaryOrganization: { id: organizationId },
        requestedTrack,
        licenseContractId,
        licenseCollectionId,
        role: WalletEarningRole.PUBLISHER_COMMISSION,
        distributionSource: WalletDistributionSource.PUBLISHER_COMMISSION,
        grossAmount,
        percentage: effectivePercentage,
        amount: fromCents(cents),
        sourceReference,
        occurredAt,
        logLabel: `publisher=${organizationId}`,
      });
    }
  }

  /**
   * Calcula la comisión (en centavos) por organización publisher a partir del
   * snapshot congelado en el `RequestedTrack`. Solo aplica a los vendedores
   * presentes en este reparto. Si la comisión total excede el bruto, se topa al
   * bruto escalando proporcionalmente (guarda de seguridad).
   */
  private resolvePublisherCommission(
    requestedTrack: RequestedTrack,
    entries: ResolvedDistribution['entries'],
    grossCents: number,
    sourceReference: string,
  ): Map<string, number> {
    const beneficiaryIds = new Set(entries.map((entry) => entry.userId));
    const applicable = (requestedTrack.publisherCommissionSnapshot ?? []).filter((snapshotEntry) =>
      beneficiaryIds.has(snapshotEntry.beneficiaryUserId),
    );

    const commissionCentsByOrg = new Map<string, number>();
    for (const snapshotEntry of applicable) {
      const cents = commissionCentsFor(grossCents, Number(snapshotEntry.percentage));
      commissionCentsByOrg.set(
        snapshotEntry.publisherOrganizationId,
        (commissionCentsByOrg.get(snapshotEntry.publisherOrganizationId) ?? 0) + cents,
      );
    }

    const total = [...commissionCentsByOrg.values()].reduce((acc, cents) => acc + cents, 0);
    if (total > grossCents && total > 0) {
      this.logger.warn(
        `[Wallet] comisión de publisher (${total}) excede el bruto (${grossCents}) para ${sourceReference}; se topa al bruto`,
      );
      const scale = grossCents / total;
      for (const [organizationId, cents] of commissionCentsByOrg) {
        commissionCentsByOrg.set(organizationId, Math.floor(cents * scale));
      }
    }
    return commissionCentsByOrg;
  }

  /** Persiste un `WalletEarning` de forma idempotente (ignora duplicados 23505). */
  private async saveEarning(payload: {
    beneficiary: { id: string } | null;
    beneficiaryOrganization: { id: string } | null;
    requestedTrack: RequestedTrack;
    licenseContractId: string | null;
    licenseCollectionId: string | null;
    role: WalletEarningRole;
    distributionSource: WalletDistributionSource;
    grossAmount: number;
    percentage: number;
    amount: number;
    sourceReference: string;
    occurredAt: Date;
    logLabel: string;
  }): Promise<void> {
    try {
      await this.earningRepo.save({
        beneficiary: payload.beneficiary as any,
        beneficiaryOrganization: payload.beneficiaryOrganization as any,
        requestedTrack: { id: payload.requestedTrack.id } as any,
        licenseContract: payload.licenseContractId ? ({ id: payload.licenseContractId } as any) : null,
        licenseCollection: payload.licenseCollectionId ? ({ id: payload.licenseCollectionId } as any) : null,
        trackTitle: payload.requestedTrack.track.title,
        role: payload.role,
        distributionSource: payload.distributionSource,
        grossAmount: payload.grossAmount,
        percentage: payload.percentage,
        amount: payload.amount,
        sourceReference: payload.sourceReference,
        occurredAt: payload.occurredAt,
      });
      this.logger.log(
        `[Wallet] crédito ${payload.amount} para ${payload.logLabel} sourceReference=${payload.sourceReference}`,
      );
    } catch (err: any) {
      if (err?.code === '23505') {
        this.logger.warn(
          `[Wallet] crédito duplicado ignorado: sourceReference=${payload.sourceReference} ${payload.logLabel}`,
        );
        return;
      }
      throw err;
    }
  }

  async getBalance(userId: string): Promise<WalletBalance> {
    const earnings = await this.earningRepo.find({ where: { beneficiary: { id: userId } } });
    const totalEarnedOwn = this.sum(earnings.filter((e) => e.role === WalletEarningRole.OWN));
    const totalEarnedCoauthor = this.sum(earnings.filter((e) => e.role === WalletEarningRole.COAUTHOR));
    const totalEarned = totalEarnedOwn + totalEarnedCoauthor;

    const withdrawals = await this.withdrawalRepo.find({ where: { user: { id: userId } } });
    const { totalWithdrawnPaid, totalReserved } = this.aggregateWithdrawals(withdrawals);
    const availableBalance = Math.round((totalEarned - totalWithdrawnPaid - totalReserved) * 100) / 100;

    return {
      totalEarnedOwn,
      totalEarnedCoauthor,
      totalEarned,
      totalWithdrawnPaid,
      totalReserved,
      availableBalance,
      currency: 'COP',
    };
  }

  /**
   * Balance de la wallet de una organización (publisher). Todas sus ganancias
   * son comisiones (`PUBLISHER_COMMISSION`), por lo que no hay desglose
   * own/coautor: el total se reporta en `totalEarnedOwn` por compatibilidad.
   */
  async getOrganizationBalance(organizationId: string): Promise<WalletBalance> {
    const earnings = await this.earningRepo.find({
      where: { beneficiaryOrganization: { id: organizationId } },
    });
    const totalEarned = this.sum(earnings);

    const withdrawals = await this.withdrawalRepo.find({
      where: { beneficiaryOrganization: { id: organizationId } },
    });
    const { totalWithdrawnPaid, totalReserved } = this.aggregateWithdrawals(withdrawals);
    const availableBalance = Math.round((totalEarned - totalWithdrawnPaid - totalReserved) * 100) / 100;

    return {
      totalEarnedOwn: totalEarned,
      totalEarnedCoauthor: 0,
      totalEarned,
      totalWithdrawnPaid,
      totalReserved,
      availableBalance,
      currency: 'COP',
    };
  }

  async getEarningsHistory(userId: string, pagination: EarningsPaginationDto) {
    const { limit = 10, offset = 0, role } = pagination;
    const [data, total] = await this.earningRepo.findAndCount({
      where: { beneficiary: { id: userId }, ...(role ? { role } : {}) },
      order: { occurredAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  async getOrganizationEarningsHistory(organizationId: string, pagination: EarningsPaginationDto) {
    const { limit = 10, offset = 0 } = pagination;
    const [data, total] = await this.earningRepo.findAndCount({
      where: { beneficiaryOrganization: { id: organizationId } },
      order: { occurredAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  private aggregateWithdrawals(withdrawals: WalletWithdrawal[]): {
    totalWithdrawnPaid: number;
    totalReserved: number;
  } {
    const totalWithdrawnPaid = withdrawals
      .filter((w) => w.status === WalletWithdrawalStatus.PAID)
      .reduce((acc, w) => acc + Number(w.amount), 0);
    const totalReserved = withdrawals
      .filter((w) => w.status === WalletWithdrawalStatus.PENDING || w.status === WalletWithdrawalStatus.IN_PROCESS)
      .reduce((acc, w) => acc + Number(w.amount), 0);
    return { totalWithdrawnPaid, totalReserved };
  }

  private sum(earnings: WalletEarning[]): number {
    return Math.round(earnings.reduce((acc, e) => acc + Number(e.amount), 0) * 100) / 100;
  }
}
