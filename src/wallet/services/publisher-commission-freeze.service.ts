import { Injectable } from '@nestjs/common';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { PublisherCommissionService } from 'src/publisher-commission/publisher-commission.service';
import { WalletDistributionService } from './wallet-distribution.service';

/**
 * Congela el snapshot de comisión de publisher en el `RequestedTrack` al
 * iniciar el pago de una licencia (Opción A). Resuelve el reparto vigente para
 * conocer a los vendedores y estampa la tarifa por vendedor. Mutación pura: el
 * llamador persiste el track dentro de su propia transacción (mismo contrato
 * que `CommissionService.freezeCommission`).
 */
@Injectable()
export class PublisherCommissionFreezeService {
  constructor(
    private readonly distributionService: WalletDistributionService,
    private readonly publisherCommissionService: PublisherCommissionService,
  ) {}

  async freeze(
    requestedTrack: RequestedTrack,
    opts: { licenseContractId?: string | null } = {},
  ): Promise<RequestedTrack> {
    const distribution = await this.distributionService.resolveDistribution(requestedTrack.id, {
      licenseContractId: opts.licenseContractId,
    });
    const beneficiaryUserIds = distribution.entries.map((entry) => entry.userId);
    const snapshot = await this.publisherCommissionService.resolveSnapshot(beneficiaryUserIds);

    requestedTrack.publisherCommissionSnapshot = snapshot.length ? snapshot : null;
    requestedTrack.publisherCommissionFrozenAt = new Date();
    return requestedTrack;
  }
}
