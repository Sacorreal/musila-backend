import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LicenseCollectionsService } from '../license-collections.service';

@Injectable()
export class SendPaymentLinksCron {
  private readonly logger = new Logger(SendPaymentLinksCron.name);

  constructor(private readonly collectionsService: LicenseCollectionsService) {}

  /** Corre diariamente a las 13:00 UTC (8:00 AM Colombia): envía/reintenta enlaces de pago vencidos hoy. */
  @Cron('0 13 * * *')
  async handleDueCollections() {
    const dueCollections = await this.collectionsService.findDueForSending();
    if (dueCollections.length === 0) return;

    this.logger.log(`[SendPaymentLinks] ${dueCollections.length} cobros con fecha pactada alcanzada`);

    let sent = 0;
    for (const collection of dueCollections) {
      try {
        const result = await this.collectionsService.attemptSend(collection.id);
        if (result.linkSentAt) sent += 1;
      } catch (err: any) {
        this.logger.error(`[SendPaymentLinks] cobro ${collection.id} error inesperado: ${err?.message}`);
      }
    }

    this.logger.log(`[SendPaymentLinks] ${sent}/${dueCollections.length} enlaces enviados exitosamente`);
  }
}
