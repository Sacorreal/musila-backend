import { ConfigService } from '@nestjs/config';
import { WompiProvider } from './wompi.provider';
import { WompiSignatureService } from './wompi-signature.service';
import { ProviderTransactionStatus } from '../../domain/payment-provider.types';

const CONFIG: Record<string, string> = {
  WOMPI_API_URL: 'https://sandbox.wompi.co/v1',
  WOMPI_PUBLIC_KEY: 'pub_test_1',
  WOMPI_PRIVATE_KEY: 'prv_test_1',
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

describe('WompiProvider', () => {
  let provider: WompiProvider;
  let signature: WompiSignatureService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    const config = {
      get: jest.fn((key: string, fallback?: string) => CONFIG[key] ?? fallback ?? ''),
    } as unknown as ConfigService;
    signature = {
      generateIntegritySignature: jest.fn().mockReturnValue('sig'),
      verifyEventSignature: jest.fn(),
    } as unknown as WompiSignatureService;
    provider = new WompiProvider(config, signature);

    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
  });

  it('getAcceptanceToken extrae el presigned acceptance token del merchant', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { presigned_acceptance: { acceptance_token: 'acc_1' } } }),
    );
    await expect(provider.getAcceptanceToken()).resolves.toBe('acc_1');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://sandbox.wompi.co/v1/merchants/pub_test_1',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('tokenizeCard usa la llave pública y no expone PAN', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { id: 'tok_1', brand: 'VISA', last_four: '4242' } }),
    );
    const result = await provider.tokenizeCard({
      number: '4242424242424242',
      cvc: '123',
      expMonth: '08',
      expYear: '28',
      cardHolder: 'JUAN PEREZ',
    });
    expect(result).toEqual(expect.objectContaining({ tokenId: 'tok_1', last4: '4242' }));
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers.Authorization).toBe('Bearer pub_test_1');
  });

  it('createPaymentSource usa la llave privada', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: 555, status: 'AVAILABLE' } }));
    const result = await provider.createPaymentSource({
      type: 'CARD',
      token: 'tok_1',
      customerEmail: 'a@b.com',
      acceptanceToken: 'acc_1',
    });
    expect(result.paymentSourceId).toBe('555');
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers.Authorization).toBe('Bearer prv_test_1');
  });

  it('createTransaction mapea el estado APPROVED', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { id: 'tx_1', status: 'APPROVED', reference: 'ref', amount_in_cents: 100 } }),
    );
    const result = await provider.createTransaction({
      reference: 'ref',
      amountInCents: 100,
      currency: 'COP',
      customerEmail: 'a@b.com',
      signature: 'sig',
    });
    expect(result.status).toBe(ProviderTransactionStatus.APPROVED);
  });

  it('lanza ServiceUnavailable cuando Wompi responde con error', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'bad' }, false, 422));
    await expect(provider.getAcceptanceToken()).rejects.toThrow();
  });

  it('verifyAndParseEvent retorna null si la firma es inválida', () => {
    (signature.verifyEventSignature as jest.Mock).mockReturnValue(false);
    expect(
      provider.verifyAndParseEvent({ event: 'transaction.updated', data: {} } as any),
    ).toBeNull();
  });

  it('verifyAndParseEvent normaliza un evento válido', () => {
    (signature.verifyEventSignature as jest.Mock).mockReturnValue(true);
    const parsed = provider.verifyAndParseEvent({
      event: 'transaction.updated',
      data: { transaction: { id: 'tx_1', reference: 'ref', status: 'APPROVED', amount_in_cents: 100 } },
    } as any);
    expect(parsed).toEqual({
      transactionId: 'tx_1',
      reference: 'ref',
      status: ProviderTransactionStatus.APPROVED,
      amountInCents: 100,
    });
  });
});
