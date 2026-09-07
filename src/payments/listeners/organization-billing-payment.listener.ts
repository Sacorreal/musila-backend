import { Injectable, Logger } from '@nestjs/common';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { OrganizationBillingService } from '../organization-billing.service';

/**
 * Puente desacoplado entre el webhook de la pasarela y el onboarding B2B.
 * `PaymentsService` emite `payment.webhook.unmatched` cuando una referencia no
 * corresponde a una suscripción/licencia/colección/pauta; aquí intentamos
 * casarla con una `OrganizationBillingRequest`. Mismo patrón que
 * `PromotionPaymentListener`.
 */
@Injectable()
export class OrganizationBillingPaymentListener {
  private readonly logger = new Logger(OrganizationBillingPaymentListener.name);

  constructor(private readonly organizationBillingService: OrganizationBillingService) {}

  @EventListener({ event: 'payment.webhook.unmatched', channel: 'other' })
  async handleUnmatchedPayment(payload: AppEventMap['payment.webhook.unmatched']) {
    try {
      await this.organizationBillingService.handleWebhookPayment(payload.reference, payload.status);
    } catch (err) {
      this.logger.error(
        `Error procesando pago de registro B2B ref=${payload.reference}: ${(err as Error)?.message}`,
      );
    }
  }
}
