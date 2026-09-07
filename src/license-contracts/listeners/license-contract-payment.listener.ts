import { Injectable, Logger } from '@nestjs/common';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { LicenseContractsService } from '../license-contracts.service';
import { LicenseContractPaymentStatus } from '../entities/license-contract-payment-status.enum';

@Injectable()
export class LicenseContractPaymentListener {
  private readonly logger = new Logger(LicenseContractPaymentListener.name);

  constructor(private readonly licenseContractsService: LicenseContractsService) {}

  @EventListener({ event: 'license.contract.fully_paid', channel: 'other' })
  async handleFullyPaid(payload: AppEventMap['license.contract.fully_paid']) {
    try {
      await this.licenseContractsService.markPaymentStatus(
        payload.licenseContractId,
        LicenseContractPaymentStatus.PAGADA,
      );
    } catch (error) {
      this.logger.error(`Error marcando contrato ${payload.licenseContractId} como PAGADA`, error);
    }
  }

  /**
   * Si cualquier cuota vence sin pagarse, el contrato completo pasa a EN_MORA
   * (decisión de negocio: señal conservadora, aunque cada cuota mantiene su
   * propio estado individual).
   */
  @EventListener({ event: 'license.collection.overdue', channel: 'other' })
  async handleCollectionOverdue(payload: AppEventMap['license.collection.overdue']) {
    if (!payload.licenseContractId) return;

    try {
      await this.licenseContractsService.markPaymentStatus(
        payload.licenseContractId,
        LicenseContractPaymentStatus.EN_MORA,
      );
    } catch (error) {
      this.logger.error(`Error marcando contrato ${payload.licenseContractId} como EN_MORA`, error);
    }
  }
}
