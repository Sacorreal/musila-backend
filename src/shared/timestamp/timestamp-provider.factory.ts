import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TIMESTAMP_PROVIDER, TimestampProvider } from './domain/timestamp-provider.interface';
import { TimestampProviderName } from './domain/timestamp.types';
import { FreeTsaProvider } from './providers/free-tsa/free-tsa.provider';
import { OpenTimestampProvider } from './providers/open-timestamp/open-timestamp.provider';

/**
 * Único lugar donde se decide qué implementación de TimestampProvider se activa,
 * a partir de TIMESTAMP_PROVIDER (env var, vía ConfigService). Es un mapa de
 * registro, no un if/switch: agregar un proveedor futuro (Certicámara, GlobalSign,
 * Adobe, Azure Trusted Signing) solo requiere una entrada más en `registry`.
 * Falla en el registro del módulo (bootstrap de Nest), no en runtime de negocio.
 */
export const timestampProviderFactory: FactoryProvider<TimestampProvider> = {
  provide: TIMESTAMP_PROVIDER,
  inject: [ConfigService, OpenTimestampProvider, FreeTsaProvider],
  useFactory: (
    config: ConfigService,
    openTimestampProvider: OpenTimestampProvider,
    freeTsaProvider: FreeTsaProvider,
  ): TimestampProvider => {
    const registry: Record<TimestampProviderName, TimestampProvider> = {
      opentimestamps: openTimestampProvider,
      freetsa: freeTsaProvider,
    };

    const selected = (config.get<string>('TIMESTAMP_PROVIDER')?.trim() || 'opentimestamps') as TimestampProviderName;
    const provider = registry[selected];

    if (!provider) {
      throw new Error(
        `TIMESTAMP_PROVIDER="${selected}" no es válido. Valores soportados: ${Object.keys(registry).join(', ')}.`,
      );
    }

    return provider;
  },
};
