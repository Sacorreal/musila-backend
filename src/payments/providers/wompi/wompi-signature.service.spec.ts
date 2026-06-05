import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WompiSignatureService } from './wompi-signature.service';
import { ProviderEvent } from '../../domain/payment-provider.types';

const SECRETS: Record<string, string> = {
  WOMPI_INTEGRITY_SECRET: 'test_integrity_secret',
  WOMPI_EVENTS_SECRET: 'test_events_secret',
};

function makeService(): WompiSignatureService {
  const config = {
    get: jest.fn((key: string, fallback?: string) => SECRETS[key] ?? fallback ?? ''),
  } as unknown as ConfigService;
  return new WompiSignatureService(config);
}

describe('WompiSignatureService', () => {
  let service: WompiSignatureService;

  beforeEach(() => {
    service = makeService();
  });

  describe('generateIntegritySignature', () => {
    it('concatena reference + amountInCents + currency + secret en ese orden', () => {
      const input = { reference: 'ref-123', amountInCents: 3990000, currency: 'COP' };
      const expected = crypto
        .createHash('sha256')
        .update(`ref-1233990000COP${SECRETS.WOMPI_INTEGRITY_SECRET}`)
        .digest('hex');

      expect(service.generateIntegritySignature(input)).toBe(expected);
    });

    it('incluye expirationTime cuando se provee', () => {
      const input = {
        reference: 'ref-123',
        amountInCents: 3990000,
        currency: 'COP',
        expirationTime: '2026-01-01T00:00:00.000Z',
      };
      const expected = crypto
        .createHash('sha256')
        .update(`ref-1233990000COP2026-01-01T00:00:00.000Z${SECRETS.WOMPI_INTEGRITY_SECRET}`)
        .digest('hex');

      expect(service.generateIntegritySignature(input)).toBe(expected);
    });
  });

  describe('verifyEventSignature', () => {
    const buildEvent = (checksum: string): ProviderEvent => ({
      event: 'transaction.updated',
      data: { transaction: { id: '1234-1610641025-49201', status: 'APPROVED', amount_in_cents: 4490000 } },
      signature: {
        properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
        checksum,
      },
      timestamp: 1530291411,
    });

    const validChecksum = () => {
      const concatenated = '1234-1610641025-49201APPROVED4490000';
      return crypto
        .createHash('sha256')
        .update(`${concatenated}1530291411${SECRETS.WOMPI_EVENTS_SECRET}`)
        .digest('hex')
        .toUpperCase();
    };

    it('acepta un evento con checksum válido', () => {
      expect(service.verifyEventSignature(buildEvent(validChecksum()))).toBe(true);
    });

    it('rechaza un evento con checksum manipulado', () => {
      expect(service.verifyEventSignature(buildEvent('DEADBEEF'))).toBe(false);
    });

    it('rechaza un evento sin firma', () => {
      const event = { event: 'transaction.updated', data: {}, timestamp: 1 } as ProviderEvent;
      expect(service.verifyEventSignature(event)).toBe(false);
    });
  });
});
