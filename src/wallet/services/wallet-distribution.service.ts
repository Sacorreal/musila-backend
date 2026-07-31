import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { LicenseContract } from 'src/license-contracts/entities/license-contract.entity';
import { Split } from 'src/splits/entities/split.entity';
import { SplitStatus } from 'src/splits/entities/split-status.enum';
import { WalletDistributionSource } from '../entities/wallet-distribution-source.enum';

export interface DistributionEntry {
  userId: string;
  percentage: number;
}

export interface ResolvedDistribution {
  requestedTrack: RequestedTrack;
  entries: DistributionEntry[];
  source: WalletDistributionSource;
}

const PERCENTAGE_SUM_TOLERANCE = 0.5;

@Injectable()
export class WalletDistributionService {
  private readonly logger = new Logger(WalletDistributionService.name);

  constructor(
    @InjectRepository(RequestedTrack)
    private readonly requestedTrackRepo: Repository<RequestedTrack>,
    @InjectRepository(LicenseContract)
    private readonly licenseContractRepo: Repository<LicenseContract>,
    @InjectRepository(Split)
    private readonly splitRepo: Repository<Split>,
  ) {}

  /**
   * Resuelve cómo repartir un monto entre los beneficiarios de una venta de
   * licencia. Prioridad: distribución de anticipo del contrato > split de
   * coautoría del track > reparto igualitario entre autores (fallback).
   */
  async resolveDistribution(
    requestedTrackId: string,
    opts: { licenseContractId?: string | null } = {},
  ): Promise<ResolvedDistribution> {
    const requestedTrack = await this.requestedTrackRepo.findOne({
      where: { id: requestedTrackId },
      relations: ['owner', 'track', 'track.authors'],
    });
    if (!requestedTrack) {
      throw new NotFoundException(`RequestedTrack ${requestedTrackId} no encontrado`);
    }

    if (opts.licenseContractId) {
      const contractEntries = await this.resolveFromContract(opts.licenseContractId);
      if (contractEntries) {
        return { requestedTrack, entries: contractEntries, source: WalletDistributionSource.CONTRACT_ADVANCE_DISTRIBUTION };
      }
    }

    const splitEntries = await this.resolveFromSplit(requestedTrack.track.id);
    if (splitEntries) {
      return { requestedTrack, entries: splitEntries, source: WalletDistributionSource.SPLIT };
    }

    return {
      requestedTrack,
      entries: this.resolveEqualFallback(requestedTrack),
      source: WalletDistributionSource.EQUAL_FALLBACK,
    };
  }

  private async resolveFromContract(licenseContractId: string): Promise<DistributionEntry[] | null> {
    const contract = await this.licenseContractRepo.findOne({ where: { id: licenseContractId } });
    if (!contract?.advanceDistribution?.length) return null;

    const sum = contract.advanceDistribution.reduce((acc, entry) => acc + Number(entry.percentage), 0);
    if (Math.abs(sum - 100) > PERCENTAGE_SUM_TOLERANCE) {
      this.logger.warn(
        `[Wallet] advanceDistribution del contrato ${licenseContractId} suma ${sum}% (esperado ~100%), se usará fallback`,
      );
      return null;
    }

    return contract.advanceDistribution.map((entry) => ({
      userId: entry.userId,
      percentage: Number(entry.percentage),
    }));
  }

  private async resolveFromSplit(trackId: string): Promise<DistributionEntry[] | null> {
    const split = await this.splitRepo.findOne({
      where: { track: { id: trackId }, status: SplitStatus.COMPLETED },
      relations: ['authors', 'authors.user'],
    });
    if (!split?.authors?.length) return null;

    return split.authors.map((author) => ({
      userId: author.user.id,
      percentage: Number(author.percentage),
    }));
  }

  private resolveEqualFallback(requestedTrack: RequestedTrack): DistributionEntry[] {
    const authors = requestedTrack.track.authors ?? [];
    if (!authors.length) {
      this.logger.warn(
        `[Wallet] Track ${requestedTrack.track.id} sin autores; se acredita el 100% al owner ${requestedTrack.owner.id} para reconciliación manual`,
      );
      return [{ userId: requestedTrack.owner.id, percentage: 100 }];
    }

    const basePercentage = Math.round((100 / authors.length) * 100) / 100;
    const entries = authors.map((author) => ({ userId: author.id, percentage: basePercentage }));
    // Ajusta el último autor para que la suma sea exactamente 100 (evita
    // fugas por redondeo, ej. 3 autores -> 33.33% x3 = 99.99%).
    const roundingDrift = 100 - basePercentage * authors.length;
    entries[entries.length - 1].percentage = Math.round((basePercentage + roundingDrift) * 100) / 100;
    return entries;
  }
}
