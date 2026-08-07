/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotImplementedException } from '@nestjs/common';
import { PaymentProvider } from '../../domain/payment-provider.interface';
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
} from '../../domain/payment-provider.types';

/**
 * Andamiaje del puerto `PaymentProvider` para Stripe. Aún no implementado:
 * la interfaz actual está modelada sobre el flujo específico de Wompi
 * (acceptance_token, tokenización de tarjeta con PAN crudo en backend,
 * firma de integridad del Widget), conceptos sin equivalente directo en
 * Stripe, que tokeniza en el cliente vía Stripe.js/Elements y opera con
 * PaymentIntent/SetupIntent. Implementar esto requiere primero decidir
 * cómo adaptar ese flujo (o el puerto) al modelo de Stripe.
 */
@Injectable()
export class StripeProvider implements PaymentProvider {
  readonly name: ProviderName = 'stripe';

  getAcceptanceToken(): Promise<string> {
    throw new NotImplementedException(
      'StripeProvider.getAcceptanceToken aún no está implementado',
    );
  }

  tokenizeCard(_input: TokenizeCardInput): Promise<TokenizeCardResult> {
    throw new NotImplementedException(
      'StripeProvider.tokenizeCard aún no está implementado',
    );
  }

  createPaymentSource(
    _input: CreatePaymentSourceInput,
  ): Promise<CreatePaymentSourceResult> {
    throw new NotImplementedException(
      'StripeProvider.createPaymentSource aún no está implementado',
    );
  }

  createTransaction(_input: CreateTransactionInput): Promise<TransactionResult> {
    throw new NotImplementedException(
      'StripeProvider.createTransaction aún no está implementado',
    );
  }

  chargeRecurring(_input: ChargeRecurringInput): Promise<TransactionResult> {
    throw new NotImplementedException(
      'StripeProvider.chargeRecurring aún no está implementado',
    );
  }

  generateIntegritySignature(_input: IntegritySignatureInput): string {
    throw new NotImplementedException(
      'StripeProvider.generateIntegritySignature aún no está implementado',
    );
  }

  verifyAndParseEvent(_event: ProviderEvent): ParsedTransactionEvent | null {
    throw new NotImplementedException(
      'StripeProvider.verifyAndParseEvent aún no está implementado',
    );
  }
}
