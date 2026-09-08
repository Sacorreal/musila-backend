import { Injectable, Logger } from '@nestjs/common';
import { EventListener } from '../../shared/events/decorators/event-listener.decorator';
import { AppEventMap } from '../../shared/events/contracts/app-event-map';
import { CampaignsService } from '../campaigns.service';

/**
 * Cuando el flujo de licenciamiento ya implementado llega a término (contrato
 * cumplido), marca la postulación de campaña asociada como `LICENSED`. Nunca
 * bloquea el flujo de contratos si falla: captura y loguea.
 */
@Injectable()
export class CampaignLicenseFulfilledListener {
  private readonly logger = new Logger(CampaignLicenseFulfilledListener.name);

  constructor(private readonly campaignsService: CampaignsService) {}

  @EventListener({ event: 'license.contract.fulfilled', channel: 'other' })
  async onLicenseFulfilled(payload: AppEventMap['license.contract.fulfilled']) {
    try {
      await this.campaignsService.markLicensedByRequestedTrackId(payload.requestedTrackId);
    } catch (err) {
      this.logger.error(
        `Error marcando postulación de campaña como licenciada (requestedTrackId=${payload.requestedTrackId}): ${(err as Error)?.message}`,
      );
    }
  }
}
