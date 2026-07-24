import { Injectable, Logger } from '@nestjs/common';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { LicenseCollectionsService } from '../license-collections.service';

@Injectable()
export class LicenseCollectionPaymentListener {
  private readonly logger = new Logger(LicenseCollectionPaymentListener.name);

  constructor(private readonly collectionsService: LicenseCollectionsService) {}

  @EventListener({
    event: 'track.request.license.approved',
    channel: 'other',
  })
  async handleLicenseApproved(payload: AppEventMap['track.request.license.approved']) {
    try {
      await this.collectionsService.markPaidFromRequestedTrack(payload.requestId);
    } catch (error) {
      this.logger.error('Error marcando como pagado el cobro de track.request.license.approved', error);
    }
  }
}
