import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BANK_TRANSFER_PROVIDER, BankTransferProvider } from './domain/bank-transfer-provider.interface';
import { BankTransferProviderName } from './domain/bank-transfer-provider.types';
import { WompiBankTransferProvider } from './providers/wompi/wompi-bank-transfer.provider';

/**
 * Único lugar donde se decide qué implementación de BankTransferProvider se
 * activa, a partir de BANK_TRANSFER_PROVIDER (env var, vía ConfigService). Es
 * un mapa de registro, no un if/switch: agregar un proveedor futuro solo
 * requiere una entrada más en `registry`. Falla en el registro del módulo
 * (bootstrap de Nest), no en runtime de negocio. Mismo patrón usado en
 * `payment-provider.factory.ts` y `src/shared/timestamp/timestamp-provider.factory.ts`.
 */
export const bankTransferProviderFactory: FactoryProvider<BankTransferProvider> = {
  provide: BANK_TRANSFER_PROVIDER,
  inject: [ConfigService, WompiBankTransferProvider],
  useFactory: (
    config: ConfigService,
    wompiBankTransferProvider: WompiBankTransferProvider,
  ): BankTransferProvider => {
    const registry: Record<BankTransferProviderName, BankTransferProvider> = {
      wompi: wompiBankTransferProvider,
    };

    const selected = (config.get<string>('BANK_TRANSFER_PROVIDER')?.trim() || 'wompi') as BankTransferProviderName;
    const provider = registry[selected];

    if (!provider) {
      throw new Error(
        `BANK_TRANSFER_PROVIDER="${selected}" no es válido. Valores soportados: ${Object.keys(registry).join(', ')}.`,
      );
    }

    return provider;
  },
};
