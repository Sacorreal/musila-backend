import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LicenseContractsService } from '../license-contracts.service';

@Injectable()
export class ExpireLicenseContractsCron {
  private readonly logger = new Logger(ExpireLicenseContractsCron.name);

  constructor(private readonly licenseContractsService: LicenseContractsService) {}

  /** Corre diariamente a las 14:00 UTC: evalúa licencias firmadas cuya vigencia venció. */
  @Cron('0 14 * * *')
  async handleExpiration() {
    const candidates = await this.licenseContractsService.findSignedContractsPastValidity();
    if (candidates.length === 0) return;

    this.logger.log(`[ExpireLicenseContracts] ${candidates.length} contratos vencidos por revisar`);

    let processed = 0;
    for (const contract of candidates) {
      try {
        await this.licenseContractsService.evaluateValidityForContract(contract);
        processed += 1;
      } catch (err: any) {
        this.logger.error(`[ExpireLicenseContracts] contrato ${contract.id} error inesperado: ${err?.message}`);
      }
    }

    this.logger.log(`[ExpireLicenseContracts] ${processed}/${candidates.length} contratos procesados`);
  }
}
