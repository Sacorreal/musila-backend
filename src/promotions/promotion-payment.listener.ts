import { Injectable, Logger } from '@nestjs/common';
import { EventListener } from '../shared/events/decorators/event-listener.decorator';
import { AppEventMap } from '../shared/events/contracts/app-event-map';
import { PromotionsService } from './promotions.service';

/**
 * Puente desacoplado entre el webhook de la pasarela y el dominio de pautas.
 * `PaymentsService` emite `payment.webhook.unmatched` cuando una referencia no
 * corresponde a una suscripción/licencia/colección; aquí intentamos casarla con
 * una pauta. Evita una dependencia circular entre PaymentsModule y
 * PromotionsModule (el checkout va en un solo sentido: promotions → payments).
 */
@Injectable()
export class PromotionPaymentListener {
  private readonly logger = new Logger(PromotionPaymentListener.name);

  constructor(private readonly promotionsService: PromotionsService) {}

  @EventListener({ event: 'payment.webhook.unmatched', channel: 'other' })
  async handleUnmatchedPayment(payload: AppEventMap['payment.webhook.unmatched']) {
    try {
      await this.promotionsService.handlePromotionPayment({
        reference: payload.reference,
        status: payload.status,
        transactionId: payload.transactionId,
      });
    } catch (err) {
      this.logger.error(
        `Error procesando pago de pauta ref=${payload.reference}: ${(err as Error)?.message}`,
      );
    }
  }
}
