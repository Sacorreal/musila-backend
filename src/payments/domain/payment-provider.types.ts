/**
 * Tipos de dominio del proveedor de pago.
 *
 * IMPORTANTE: todos los montos se expresan en CENTAVOS de la moneda
 * (p. ej. 39900 COP => 3990000 centavos). Wompi siempre opera en centavos
 * (`amount_in_cents`). La conversión a centavos ocurre en un único punto del
 * provider para evitar errores de unidad.
 */

export type ProviderName = 'wompi';

/** Estados normalizados de una transacción, alineados con Wompi. */
export enum ProviderTransactionStatus {
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  VOIDED = 'VOIDED',
  ERROR = 'ERROR',
  PENDING = 'PENDING',
}

/** Estado de una fuente de pago (payment source) tokenizada. */
export enum ProviderPaymentSourceStatus {
  AVAILABLE = 'AVAILABLE',
  PENDING = 'PENDING',
  ERROR = 'ERROR',
}

/** Datos para generar la firma de integridad del Widget. */
export interface IntegritySignatureInput {
  reference: string;
  amountInCents: number;
  currency: string;
  /** Fecha de expiración ISO opcional, si se incluye debe entrar en la firma. */
  expirationTime?: string;
}

/** Parámetros que el frontend necesita para abrir el Widget de Wompi. */
export interface WidgetParams {
  publicKey: string;
  currency: string;
  amountInCents: number;
  reference: string;
  signature: string;
  redirectUrl: string;
}

/** Tarjeta a tokenizar. Estos datos NUNCA se persisten. */
export interface TokenizeCardInput {
  number: string;
  cvc: string;
  expMonth: string;
  expYear: string;
  cardHolder: string;
}

export interface TokenizeCardResult {
  tokenId: string;
  brand?: string;
  last4?: string;
  expMonth?: string;
  expYear?: string;
}

export interface CreatePaymentSourceInput {
  type: 'CARD';
  token: string;
  customerEmail: string;
  acceptanceToken: string;
}

export interface CreatePaymentSourceResult {
  paymentSourceId: string;
  status: ProviderPaymentSourceStatus;
}

export interface CreateTransactionInput {
  reference: string;
  amountInCents: number;
  currency: string;
  customerEmail: string;
  /** Firma de integridad ya calculada (requerida por la API de transacciones). */
  signature: string;
  redirectUrl?: string;
}

export interface ChargeRecurringInput {
  reference: string;
  amountInCents: number;
  currency: string;
  customerEmail: string;
  paymentSourceId: string;
}

export interface TransactionResult {
  transactionId: string;
  status: ProviderTransactionStatus;
  reference: string;
  amountInCents: number;
}

/** Evento entrante de webhook (forma cruda recibida del proveedor). */
export interface ProviderEvent {
  event: string;
  data: Record<string, any>;
  environment?: string;
  signature?: {
    properties: string[];
    checksum: string;
  };
  timestamp?: number;
  sent_at?: string;
}

/** Resultado normalizado tras validar y parsear un evento. */
export interface ParsedTransactionEvent {
  transactionId: string;
  reference: string;
  status: ProviderTransactionStatus;
  amountInCents?: number;
}
