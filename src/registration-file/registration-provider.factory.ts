import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REGISTRATION_PROVIDER, RegistrationProvider } from './domain/registration-provider.interface';
import { RegistrationProviderName } from './domain/registration-provider.types';
import { ManualRegistrationProvider } from './providers/manual/manual-registration.provider';
import { SaycoApiProvider } from './providers/sayco-api/sayco-api.provider';
import { DndaApiProvider } from './providers/dnda-api/dnda-api.provider';

/**
 * Único lugar donde se decide qué implementación de `RegistrationProvider` se
 * activa, a partir de `REGISTRATION_PROVIDER` (env var, vía `ConfigService`).
 * Mapa de registro, no if/switch — mismo patrón que `payment-provider.factory.ts`
 * y `timestamp-provider.factory.ts`.
 */
export const registrationProviderFactory: FactoryProvider<RegistrationProvider> = {
  provide: REGISTRATION_PROVIDER,
  inject: [ConfigService, ManualRegistrationProvider, SaycoApiProvider, DndaApiProvider],
  useFactory: (
    config: ConfigService,
    manualProvider: ManualRegistrationProvider,
    saycoApiProvider: SaycoApiProvider,
    dndaApiProvider: DndaApiProvider,
  ): RegistrationProvider => {
    const registry: Record<RegistrationProviderName, RegistrationProvider> = {
      manual: manualProvider,
      'sayco-api': saycoApiProvider,
      'dnda-api': dndaApiProvider,
    };

    const selected = (config.get<string>('REGISTRATION_PROVIDER')?.trim() || 'manual') as RegistrationProviderName;
    const provider = registry[selected];

    if (!provider) {
      throw new Error(
        `REGISTRATION_PROVIDER="${selected}" no es válido. Valores soportados: ${Object.keys(registry).join(', ')}.`,
      );
    }

    return provider;
  },
};
