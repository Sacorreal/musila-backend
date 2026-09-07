import { Injectable, Logger } from '@nestjs/common';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { AffiliateCommissionsService } from '../affiliate-commissions.service';

@Injectable()
export class AffiliateCommissionListener {
  private readonly logger = new Logger(AffiliateCommissionListener.name);

  constructor(private readonly commissionsService: AffiliateCommissionsService) {}

  @EventListener({ event: 'payment.subscription.approved', channel: 'other' })
  async handlePaymentApproved(payload: AppEventMap['payment.subscription.approved']) {
    try {
      await this.commissionsService.createCommissionForPurchase(payload);
    } catch (error) {
      this.logger.error(
        `Error procesando comisión de afiliado para paymentId=${payload.paymentId}`,
        error,
      );
    }
  }
}
