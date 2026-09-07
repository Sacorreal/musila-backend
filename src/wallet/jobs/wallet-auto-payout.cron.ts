import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WalletEarningsService } from '../services/wallet-earnings.service';
import { WalletWithdrawalsService } from '../services/wallet-withdrawals.service';

/**
 * Reemplaza la solicitud manual de retiro: todos los lunes se genera
 * automáticamente, para cada usuario y organización con saldo disponible,
 * una solicitud de retiro por el total acreditado (`origin=scheduled`). El
 * pago bancario en sí lo sigue confirmando un admin desde el panel una vez
 * hecha la transferencia (no hay pasarela de pago saliente integrada), pero
 * el usuario ya no interviene: la solicitud existe sin ninguna acción suya.
 */
@Injectable()
export class WalletAutoPayoutCron {
  private readonly logger = new Logger(WalletAutoPayoutCron.name);

  constructor(
    private readonly earningsService: WalletEarningsService,
    private readonly withdrawalsService: WalletWithdrawalsService,
  ) {}

  /** Todos los lunes a las 08:00 (hora del servidor). */
  @Cron('0 8 * * 1')
  async handleWeeklyPayout(): Promise<void> {
    let created = 0;
    let skipped = 0;

    const userIds = await this.earningsService.getUserIdsWithEarnings();
    for (const userId of userIds) {
      try {
        const withdrawal = await this.withdrawalsService.createScheduled(userId);
        if (withdrawal) created++;
        else skipped++;
      } catch (error) {
        this.logger.error(`[wallet-auto-payout] error generando retiro para usuario=${userId}`, error);
      }
    }

    const organizationIds = await this.earningsService.getOrganizationIdsWithEarnings();
    for (const organizationId of organizationIds) {
      try {
        const withdrawal = await this.withdrawalsService.createScheduledForOrganization(organizationId);
        if (withdrawal) created++;
        else skipped++;
      } catch (error) {
        this.logger.error(
          `[wallet-auto-payout] error generando retiro para organización=${organizationId}`,
          error,
        );
      }
    }

    this.logger.log(`[wallet-auto-payout] pago semanal: ${created} retiros generados, ${skipped} omitidos`);
  }
}
