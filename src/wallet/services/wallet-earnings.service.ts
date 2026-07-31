import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletEarning } from '../entities/wallet-earning.entity';
import { WalletEarningRole } from '../entities/wallet-earning-role.enum';
import { LicenseContract } from 'src/license-contracts/entities/license-contract.entity';
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

    for (const entry of entries) {
      const amount = Math.round(grossAmount * (entry.percentage / 100) * 100) / 100;
      try {
        await this.earningRepo.save({
          beneficiary: { id: entry.userId } as any,
          requestedTrack: { id: requestedTrack.id } as any,
          licenseContract: licenseContractId ? ({ id: licenseContractId } as any) : null,
          licenseCollection: licenseCollectionId ? ({ id: licenseCollectionId } as any) : null,
          trackTitle: requestedTrack.track.title,
          role: entry.userId === requestedTrack.owner.id ? WalletEarningRole.OWN : WalletEarningRole.COAUTHOR,
          distributionSource: source,
          grossAmount,
          percentage: entry.percentage,
          amount,
          sourceReference,
          occurredAt,
        });
        this.logger.log(
          `[Wallet] crédito ${amount} para beneficiario=${entry.userId} sourceReference=${sourceReference}`,
        );
      } catch (err: any) {
        if (err?.code === '23505') {
          this.logger.warn(
            `[Wallet] crédito duplicado ignorado: sourceReference=${sourceReference} beneficiario=${entry.userId}`,
          );
          continue;
        }
        throw err;
      }
    }
  }

  async getBalance(userId: string): Promise<WalletBalance> {
    const earnings = await this.earningRepo.find({ where: { beneficiary: { id: userId } } });
    const totalEarnedOwn = this.sum(earnings.filter((e) => e.role === WalletEarningRole.OWN));
    const totalEarnedCoauthor = this.sum(earnings.filter((e) => e.role === WalletEarningRole.COAUTHOR));
    const totalEarned = totalEarnedOwn + totalEarnedCoauthor;

    const withdrawals = await this.withdrawalRepo.find({ where: { user: { id: userId } } });
    const totalWithdrawnPaid = withdrawals
      .filter((w) => w.status === WalletWithdrawalStatus.PAID)
      .reduce((acc, w) => acc + Number(w.amount), 0);
    const totalReserved = withdrawals
      .filter((w) => w.status === WalletWithdrawalStatus.PENDING || w.status === WalletWithdrawalStatus.IN_PROCESS)
      .reduce((acc, w) => acc + Number(w.amount), 0);

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

  private sum(earnings: WalletEarning[]): number {
    return Math.round(earnings.reduce((acc, e) => acc + Number(e.amount), 0) * 100) / 100;
  }
}
