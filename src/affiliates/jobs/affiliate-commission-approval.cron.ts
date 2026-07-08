import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AffiliateCommissionsService } from '../affiliate-commissions.service';

@Injectable()
export class AffiliateCommissionApprovalCron {
  private readonly logger = new Logger(AffiliateCommissionApprovalCron.name);

  constructor(private readonly commissionsService: AffiliateCommissionsService) {}

  /** Corre diariamente a las 3:00 UTC: aprueba comisiones pendientes cuyo plazo de 30 días venció. */
  @Cron('0 3 * * *')
  async handleApproval() {
    const approved = await this.commissionsService.approveDueCommissions();
    if (approved > 0) {
      this.logger.log(`[AffiliateCommissionApproval] ${approved} comisiones aprobadas automáticamente`);
    }
  }
}
