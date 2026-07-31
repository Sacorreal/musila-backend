import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { WalletWithdrawal } from '../entities/wallet-withdrawal.entity';
import { WalletNotificationService } from '../services/wallet-notification.service';

@Injectable()
export class WalletWithdrawalNotificationListener {
  private readonly logger = new Logger(WalletWithdrawalNotificationListener.name);

  constructor(
    @InjectRepository(WalletWithdrawal)
    private readonly withdrawalRepo: Repository<WalletWithdrawal>,
    private readonly walletNotificationService: WalletNotificationService,
  ) {}

  @EventListener({ event: 'wallet.withdrawal.requested', channel: 'in-app' })
  async handleRequested(payload: AppEventMap['wallet.withdrawal.requested']) {
    try {
      const withdrawal = await this.findWithUser(payload.withdrawalId);
      if (withdrawal) await this.walletNotificationService.notifyAdminsRequested(withdrawal);
    } catch (error) {
      this.logger.error(`Error notificando solicitud de retiro ${payload.withdrawalId}`, error);
    }
  }

  @EventListener({ event: 'wallet.withdrawal.paid', channel: 'in-app' })
  async handlePaid(payload: AppEventMap['wallet.withdrawal.paid']) {
    try {
      const withdrawal = await this.findWithUser(payload.withdrawalId);
      if (withdrawal) await this.walletNotificationService.notifyUserPaid(withdrawal);
    } catch (error) {
      this.logger.error(`Error notificando retiro pagado ${payload.withdrawalId}`, error);
    }
  }

  @EventListener({ event: 'wallet.withdrawal.rejected', channel: 'in-app' })
  async handleRejected(payload: AppEventMap['wallet.withdrawal.rejected']) {
    try {
      const withdrawal = await this.findWithUser(payload.withdrawalId);
      if (withdrawal) await this.walletNotificationService.notifyUserRejected(withdrawal);
    } catch (error) {
      this.logger.error(`Error notificando retiro rechazado ${payload.withdrawalId}`, error);
    }
  }

  private findWithUser(withdrawalId: string) {
    return this.withdrawalRepo.findOne({ where: { id: withdrawalId }, relations: ['user'] });
  }
}
