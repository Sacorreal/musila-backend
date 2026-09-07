import { SetMetadata } from '@nestjs/common';

export const CONSUME_ENTITLEMENT_KEY = 'consume_entitlement';

export interface ConsumeEntitlementMetadata {
  entitlementKey: string;
  amount: number;
}

/**
 * Marca un endpoint como consumidor de un entitlement (§8). El
 * `EntitlementConsumeInterceptor` consume la cuota de forma atómica antes
 * de ejecutar el handler y la devuelve si este falla.
 *
 *   @ConsumeEntitlement('tracks.publish')
 */
export const ConsumeEntitlement = (entitlementKey: string, amount = 1) =>
  SetMetadata<string, ConsumeEntitlementMetadata>(CONSUME_ENTITLEMENT_KEY, {
    entitlementKey,
    amount,
  });
