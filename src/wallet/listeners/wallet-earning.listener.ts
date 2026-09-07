import { Injectable, Logger } from '@nestjs/common';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { WalletEarningsService } from '../services/wallet-earnings.service';

@Injectable()
export class WalletEarningListener {
  private readonly logger = new Logger(WalletEarningListener.name);

  constructor(private readonly walletEarningsService: WalletEarningsService) {}

  @EventListener({ event: 'track.request.license.approved', channel: 'other' })
  async handleLicenseApproved(payload: AppEventMap['track.request.license.approved']) {
    try {
      await this.walletEarningsService.creditFromLicensePayment(payload.requestId);
    } catch (error) {
      this.logger.error(
        `Error acreditando wallet para requestedTrack=${payload.requestId}`,
        error,
      );
    }
  }

  @EventListener({ event: 'license.collection.installment.paid', channel: 'other' })
  async handleInstallmentPaid(payload: AppEventMap['license.collection.installment.paid']) {
    try {
      await this.walletEarningsService.creditFromInstallment({
        collectionId: payload.collectionId,
        requestedTrackId: payload.requestedTrackId,
        licenseContractId: payload.licenseContractId,
        amount: payload.amount,
        paidAt: payload.paidAt,
      });
    } catch (error) {
      this.logger.error(
        `Error acreditando wallet para cuota=${payload.collectionId}`,
        error,
      );
    }
  }
}
