import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PAYMENT_PROVIDER, PaymentProvider } from './domain/payment-provider.interface';
import { ProviderName } from './domain/payment-provider.types';
import { WompiProvider } from './providers/wompi/wompi.provider';
import { StripeProvider } from './providers/stripe/stripe.provider';

/**
 * Único lugar donde se decide qué implementación de PaymentProvider se activa,
 * a partir de PAYMENT_PROVIDER (env var, vía ConfigService). Es un mapa de
 * registro, no un if/switch: agregar un proveedor futuro solo requiere una
 * entrada más en `registry`. Falla en el registro del módulo (bootstrap de
 * Nest), no en runtime de negocio. Mismo patrón usado en
 * `src/shared/timestamp/timestamp-provider.factory.ts`.
 */
export const paymentProviderFactory: FactoryProvider<PaymentProvider> = {
  provide: PAYMENT_PROVIDER,
  inject: [ConfigService, WompiProvider, StripeProvider],
  useFactory: (
    config: ConfigService,
    wompiProvider: WompiProvider,
    stripeProvider: StripeProvider,
  ): PaymentProvider => {
    const registry: Record<ProviderName, PaymentProvider> = {
      wompi: wompiProvider,
      stripe: stripeProvider,
    };

    const selected = (config.get<string>('PAYMENT_PROVIDER')?.trim() || 'wompi') as ProviderName;
    const provider = registry[selected];

    if (!provider) {
      throw new Error(
        `PAYMENT_PROVIDER="${selected}" no es válido. Valores soportados: ${Object.keys(registry).join(', ')}.`,
      );
    }

    return provider;
  },
};
