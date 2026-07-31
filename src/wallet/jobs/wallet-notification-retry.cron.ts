import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WalletNotificationService } from '../services/wallet-notification.service';

@Injectable()
export class WalletNotificationRetryCron {
  private readonly logger = new Logger(WalletNotificationRetryCron.name);

  constructor(private readonly walletNotificationService: WalletNotificationService) {}

  /** Cada 15 minutos: reintenta notificar retiros pagados/rechazados hasta 3 veces. */
  @Cron('*/15 * * * *')
  async handleRetry() {
    try {
      await this.walletNotificationService.retryPending();
    } catch (error) {
      this.logger.error('Error en el reintento de notificaciones de wallet', error);
    }
  }
}
