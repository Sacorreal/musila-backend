import { Injectable, Logger } from '@nestjs/common';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { UserPlanSubscriptionSyncService } from '../user-plan-subscription-sync.service';

/**
 * Todos los caminos de upgrade a PRO emiten `payment.subscription.approved`
 * (pago directo, pago con tarjeta guardada y pending-registration): un solo
 * listener mantiene la Subscription del motor sincronizada.
 */
@Injectable()
export class PaymentSubscriptionSyncListener {
  private readonly logger = new Logger(PaymentSubscriptionSyncListener.name);

  constructor(private readonly syncService: UserPlanSubscriptionSyncService) {}

  @EventListener({ event: 'payment.subscription.approved', channel: 'other' })
  async handleSubscriptionApproved(payload: AppEventMap['payment.subscription.approved']) {
    try {
      await this.syncService.syncFromUser(payload.userId);
    } catch (error) {
      this.logger.error(
        `No se pudo sincronizar la subscription del usuario ${payload.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
