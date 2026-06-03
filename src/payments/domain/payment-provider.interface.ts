import {
  ChargeRecurringInput,
  CreatePaymentSourceInput,
  CreatePaymentSourceResult,
  CreateTransactionInput,
  IntegritySignatureInput,
  ParsedTransactionEvent,
  ProviderEvent,
  ProviderName,
  TokenizeCardInput,
  TokenizeCardResult,
  TransactionResult,
} from './payment-provider.types';

/**
 * Token de inyección de NestJS para el proveedor de pago activo.
 * La lógica de negocio depende de este puerto, no de una implementación concreta.
 */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

/**
 * Puerto de la capa de dominio que abstrae la pasarela de pago.
 *
 * Sustituir el proveedor solo requiere implementar esta interfaz y registrarla
 * en `payments.module.ts` mediante el token `PAYMENT_PROVIDER`. La lógica de
 * negocio (`PaymentsService`) no debe referenciar ningún SDK ni API concreta.
 */
export interface PaymentProvider {
  /** Identificador del proveedor, persistido en cada pago para auditoría. */
  readonly name: ProviderName;

  /** Obtiene el acceptance_token presignado requerido para crear fuentes de pago. */
  getAcceptanceToken(): Promise<string>;

  /** Tokeniza una tarjeta con la llave pública. No persiste PAN/CVV. */
  tokenizeCard(input: TokenizeCardInput): Promise<TokenizeCardResult>;

  /** Crea una fuente de pago (payment source) con la llave privada. */
  createPaymentSource(
    input: CreatePaymentSourceInput,
  ): Promise<CreatePaymentSourceResult>;

  /** Crea una transacción única. */
  createTransaction(input: CreateTransactionInput): Promise<TransactionResult>;

  /** Cobra una transacción recurrente usando un payment_source_id existente. */
  chargeRecurring(input: ChargeRecurringInput): Promise<TransactionResult>;

  /** Genera la firma de integridad para inicializar el Widget. */
  generateIntegritySignature(input: IntegritySignatureInput): string;

  /**
   * Verifica la autenticidad de un evento de webhook y lo normaliza.
   * Devuelve `null` si la firma es inválida.
   */
  verifyAndParseEvent(event: ProviderEvent): ParsedTransactionEvent | null;
}
