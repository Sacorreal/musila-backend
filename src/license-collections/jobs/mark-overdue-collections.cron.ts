import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LicenseCollectionsService } from '../license-collections.service';

@Injectable()
export class MarkOverdueCollectionsCron {
  private readonly logger = new Logger(MarkOverdueCollectionsCron.name);

  constructor(private readonly collectionsService: LicenseCollectionsService) {}

  /** Corre diariamente a las 13:30 UTC: marca EN_MORA los cobros cuya fecha pactada pasó sin pago. */
  @Cron('30 13 * * *')
  async handleOverdue() {
    const overdueCollections = await this.collectionsService.findOverdue();
    if (overdueCollections.length === 0) return;

    this.logger.log(`[MarkOverdueCollections] ${overdueCollections.length} cobros vencidos detectados`);

    let marked = 0;
    for (const collection of overdueCollections) {
      try {
        await this.collectionsService.markOverdue(collection);
        marked += 1;
      } catch (err: any) {
        this.logger.error(`[MarkOverdueCollections] cobro ${collection.id} error inesperado: ${err?.message}`);
      }
    }

    this.logger.log(`[MarkOverdueCollections] ${marked}/${overdueCollections.length} cobros marcados en mora`);
  }
}
