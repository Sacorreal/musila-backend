import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BankInformationNotificationService } from '../services/bank-information-notification.service';

@Injectable()
export class BankInformationNotificationRetryCron {
  private readonly logger = new Logger(BankInformationNotificationRetryCron.name);

  constructor(private readonly bankInformationNotificationService: BankInformationNotificationService) {}

  /** Cada 15 minutos: reintenta notificar solicitudes de información bancaria pendientes hasta 3 veces. */
  @Cron('*/15 * * * *')
  async handleRetry() {
    try {
      await this.bankInformationNotificationService.retryPending();
    } catch (error) {
      this.logger.error('Error en el reintento de notificaciones de información bancaria', error);
    }
  }
}
