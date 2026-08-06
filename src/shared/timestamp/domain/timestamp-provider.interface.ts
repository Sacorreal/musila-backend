import { TimestampEvidence, TimestampOptions, TimestampResult, TimestampVerification } from './timestamp.types';

/**
 * Token de inyección de NestJS para el proveedor de timestamping activo.
 * TimestampProvider es una interfaz TypeScript (se borra en tiempo de compilación),
 * por lo que no puede usarse como valor en `provide: TimestampProvider`. Mismo patrón
 * ya usado en el repo para PAYMENT_PROVIDER (src/payments/domain/payment-provider.interface.ts).
 */
export const TIMESTAMP_PROVIDER = Symbol('TIMESTAMP_PROVIDER');

export interface TimestampProvider {
  createTimestamp(hash: Buffer, options?: TimestampOptions): Promise<TimestampResult>;
  verifyTimestamp(evidence: TimestampEvidence): Promise<TimestampVerification>;
}
