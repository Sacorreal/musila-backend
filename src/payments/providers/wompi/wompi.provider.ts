import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentProvider,
} from '../../domain/payment-provider.interface';
import {
  ChargeRecurringInput,
  CreatePaymentSourceInput,
  CreatePaymentSourceResult,
  CreateTransactionInput,
  IntegritySignatureInput,
  ParsedTransactionEvent,
  ProviderEvent,
  ProviderName,
  ProviderPaymentSourceStatus,
  ProviderTransactionStatus,
  TokenizeCardInput,
  TokenizeCardResult,
  TransactionResult,
} from '../../domain/payment-provider.types';
import { WompiSignatureService } from './wompi-signature.service';

/**
 * Implementación concreta del puerto `PaymentProvider` contra la API REST de
 * Wompi (Colombia). Usa `fetch` nativo (Node 20) con base URL configurable para
 * alternar entre sandbox y producción.
 *
 * Reglas de seguridad:
 *  - La llave pública solo se usa para tokenizar tarjetas.
 *  - La llave privada se usa exclusivamente en el backend (payment_sources,
 *    transactions) y nunca se expone al cliente.
 */
@Injectable()
export class WompiProvider implements PaymentProvider {
  readonly name: ProviderName = 'wompi';
  private readonly logger = new Logger(WompiProvider.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly signatureService: WompiSignatureService,
  ) {}

  private get apiUrl(): string {
    const url = this.configService.get<string>('WOMPI_API_URL', '');
    if (!url) throw new Error('WOMPI_API_URL no está configurado');
    return url.replace(/\/$/, '');
  }

  private get publicKey(): string {
    const key = this.configService.get<string>('WOMPI_PUBLIC_KEY', '');
    if (!key) throw new Error('WOMPI_PUBLIC_KEY no está configurado');
    return key;
  }

  private get privateKey(): string {
    const key = this.configService.get<string>('WOMPI_PRIVATE_KEY', '');
    if (!key) throw new Error('WOMPI_PRIVATE_KEY no está configurado');
    return key;
  }

  // ─── Acceptance token ────────────────────────────────────────────────────────

  async getAcceptanceToken(): Promise<string> {
    const data = await this.request<any>(
      'GET',
      `/merchants/${this.publicKey}`,
    );
    const token = data?.data?.presigned_acceptance?.acceptance_token;
    if (!token) {
      throw new ServiceUnavailableException(
        'No se pudo obtener el acceptance token de Wompi',
      );
    }
    return String(token);
  }

  // ─── Tokenización ────────────────────────────────────────────────────────────

  async tokenizeCard(input: TokenizeCardInput): Promise<TokenizeCardResult> {
    const data = await this.request<any>(
      'POST',
      '/tokens/cards',
      {
        number: input.number,
        cvc: input.cvc,
        exp_month: input.expMonth,
        exp_year: input.expYear,
        card_holder: input.cardHolder,
      },
      this.publicKey,
    );

    const token = data?.data?.id;
    if (!token) {
      throw new ServiceUnavailableException('Wompi no devolvió un token de tarjeta');
    }
    return {
      tokenId: token,
      brand: data?.data?.brand,
      last4: data?.data?.last_four,
      expMonth: data?.data?.exp_month,
      expYear: data?.data?.exp_year,
    };
  }

  // ─── Fuente de pago ──────────────────────────────────────────────────────────

  async createPaymentSource(
    input: CreatePaymentSourceInput,
  ): Promise<CreatePaymentSourceResult> {
    const data = await this.request<any>(
      'POST',
      '/payment_sources',
      {
        type: input.type,
        token: input.token,
        customer_email: input.customerEmail,
        acceptance_token: input.acceptanceToken,
      },
      this.privateKey,
    );

    const id = data?.data?.id;
    if (!id) {
      throw new ServiceUnavailableException('Wompi no devolvió un payment_source_id');
    }
    return {
      paymentSourceId: String(id),
      status: this.mapPaymentSourceStatus(data?.data?.status),
    };
  }

  // ─── Transacciones ───────────────────────────────────────────────────────────

  async createTransaction(
    input: CreateTransactionInput,
  ): Promise<TransactionResult> {
    const data = await this.request<any>(
      'POST',
      '/transactions',
      {
        amount_in_cents: input.amountInCents,
        currency: input.currency,
        customer_email: input.customerEmail,
        reference: input.reference,
        signature: input.signature,
        ...(input.redirectUrl && { redirect_url: input.redirectUrl }),
      },
      this.privateKey,
    );
    return this.mapTransaction(data?.data, input.reference, input.amountInCents);
  }

  async chargeRecurring(input: ChargeRecurringInput): Promise<TransactionResult> {
    const data = await this.request<any>(
      'POST',
      '/transactions',
      {
        amount_in_cents: input.amountInCents,
        currency: input.currency,
        customer_email: input.customerEmail,
        reference: input.reference,
        payment_source_id: Number(input.paymentSourceId),
        recurrent: true,
      },
      this.privateKey,
    );
    return this.mapTransaction(data?.data, input.reference, input.amountInCents);
  }

  // ─── Firmas ──────────────────────────────────────────────────────────────────

  generateIntegritySignature(input: IntegritySignatureInput): string {
    return this.signatureService.generateIntegritySignature(input);
  }

  verifyAndParseEvent(event: ProviderEvent): ParsedTransactionEvent | null {
    if (!this.signatureService.verifyEventSignature(event)) {
      return null;
    }
    if (event.event !== 'transaction.updated') {
      // Evento autenticado pero no manejado: se ignora silenciosamente.
      return null;
    }
    const tx = event?.data?.transaction;
    if (!tx?.id || !tx?.reference) return null;

    return {
      transactionId: String(tx.id),
      reference: String(tx.reference),
      status: this.mapTransactionStatus(tx.status),
      amountInCents: tx.amount_in_cents != null ? Number(tx.amount_in_cents) : undefined,
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private mapTransaction(
    tx: any,
    reference: string,
    amountInCents: number,
  ): TransactionResult {
    return {
      transactionId: String(tx?.id ?? ''),
      status: this.mapTransactionStatus(tx?.status),
      reference: String(tx?.reference ?? reference),
      amountInCents: tx?.amount_in_cents != null ? Number(tx.amount_in_cents) : amountInCents,
    };
  }

  private mapTransactionStatus(status?: string): ProviderTransactionStatus {
    switch (status) {
      case 'APPROVED':
        return ProviderTransactionStatus.APPROVED;
      case 'DECLINED':
        return ProviderTransactionStatus.DECLINED;
      case 'VOIDED':
        return ProviderTransactionStatus.VOIDED;
      case 'ERROR':
        return ProviderTransactionStatus.ERROR;
      default:
        return ProviderTransactionStatus.PENDING;
    }
  }

  private mapPaymentSourceStatus(status?: string): ProviderPaymentSourceStatus {
    switch (status) {
      case 'AVAILABLE':
        return ProviderPaymentSourceStatus.AVAILABLE;
      case 'ERROR':
        return ProviderPaymentSourceStatus.ERROR;
      default:
        return ProviderPaymentSourceStatus.PENDING;
    }
  }

  /**
   * Cliente HTTP genérico contra Wompi.
   * @param authKey Si se provee, se envía como Bearer. Para GET de merchant no
   *                es obligatorio, pero se incluye la pública por consistencia.
   */
  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, any>,
    authKey?: string,
  ): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authKey) headers.Authorization = `Bearer ${authKey}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        ...(body && { body: JSON.stringify(body) }),
      });
    } catch (err: any) {
      this.logger.error(`[Wompi] error de red en ${method} ${path}: ${err?.message}`);
      throw new ServiceUnavailableException('Wompi no está disponible. Intenta nuevamente.');
    }

    const text = await res.text();
    const json = text ? safeJsonParse(text) : {};

    if (!res.ok) {
      this.logger.error(
        `[Wompi] ${method} ${path} respondió ${res.status}: ${text?.slice(0, 500)}`,
      );
      throw new ServiceUnavailableException(
        `Wompi rechazó la operación (${res.status})`,
      );
    }

    return json as T;
  }
}

function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
