import { TimestampProvider } from './domain/timestamp-provider.interface';
import { TimestampService } from './timestamp.service';

describe('TimestampService', () => {
  let provider: { createTimestamp: jest.Mock; verifyTimestamp: jest.Mock };
  let service: TimestampService;

  beforeEach(() => {
    provider = { createTimestamp: jest.fn(), verifyTimestamp: jest.fn() };
    service = new TimestampService(provider as unknown as TimestampProvider);
  });

  it('delega createTimestamp en el provider inyectado con los mismos argumentos', async () => {
    const hash = Buffer.from('a'.repeat(64), 'hex');
    const options = { timeoutMs: 1234 };
    const expected = { provider: 'opentimestamps' as const, evidence: Buffer.from('evidence') };
    provider.createTimestamp.mockResolvedValue(expected);

    const result = await service.createTimestamp(hash, options);

    expect(provider.createTimestamp).toHaveBeenCalledWith(hash, options);
    expect(result).toBe(expected);
  });

  it('delega verifyTimestamp en el provider inyectado con los mismos argumentos', async () => {
    const evidence = { hash: Buffer.from('a'.repeat(64), 'hex'), evidence: Buffer.from('evidence') };
    const expected = { verified: true };
    provider.verifyTimestamp.mockResolvedValue(expected);

    const result = await service.verifyTimestamp(evidence);

    expect(provider.verifyTimestamp).toHaveBeenCalledWith(evidence);
    expect(result).toBe(expected);
  });
});
