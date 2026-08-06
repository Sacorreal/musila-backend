const fromHashMock = jest.fn();
const stampMock = jest.fn();
const deserializeMock = jest.fn();
const verifyMock = jest.fn();

jest.mock(
  'javascript-opentimestamps',
  () => ({
    DetachedTimestampFile: {
      fromHash: (...args: unknown[]) => fromHashMock(...args) as unknown,
      deserialize: (...args: unknown[]) => deserializeMock(...args) as unknown,
    },
    Ops: { OpSHA256: jest.fn() },
    stamp: (...args: unknown[]) => stampMock(...args) as unknown,
    verify: (...args: unknown[]) => verifyMock(...args) as unknown,
  }),
  { virtual: true },
);

import { OpenTimestampProvider } from './open-timestamp.provider';

type OpenTimestampProviderInternals = { createTimestampOnce: (hash: Buffer) => Promise<Buffer> };

describe('OpenTimestampProvider', () => {
  let provider: OpenTimestampProvider;

  beforeEach(() => {
    jest.useFakeTimers();
    provider = new OpenTimestampProvider();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('createTimestamp', () => {
    it('devuelve el resultado del primer intento exitoso sin reintentar', async () => {
      const expectedBytes = Buffer.from('ots-bytes');
      jest.spyOn(provider as any, 'createTimestampOnce').mockResolvedValue(expectedBytes);

      const result = await provider.createTimestamp(Buffer.from('a'.repeat(64), 'hex'));

      expect(result).toEqual({ provider: 'opentimestamps', evidence: expectedBytes });
      expect((provider as any).createTimestampOnce as jest.Mock).toHaveBeenCalledTimes(1);
    });

    it('reintenta hasta 3 veces con backoff exponencial antes de rendirse', async () => {
      const createTimestampOnceSpy = jest
        .spyOn(provider as any, 'createTimestampOnce')
        .mockRejectedValue(new Error('calendar server down'));

      const promise = provider.createTimestamp(Buffer.from('b'.repeat(64), 'hex'));
      const assertion = expect(promise).rejects.toThrow('calendar server down');

      // 3 reintentos: backoff 1s, 2s, 4s
      await jest.advanceTimersByTimeAsync(1_000);
      await jest.advanceTimersByTimeAsync(2_000);
      await jest.advanceTimersByTimeAsync(4_000);

      await assertion;
      expect(createTimestampOnceSpy).toHaveBeenCalledTimes(4); // 1 intento inicial + 3 reintentos
    });

    it('resuelve si un intento posterior tiene éxito tras fallos previos', async () => {
      const expectedBytes = Buffer.from('ots-bytes');
      jest
        .spyOn(provider as any, 'createTimestampOnce')
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValueOnce(expectedBytes);

      const promise = provider.createTimestamp(Buffer.from('c'.repeat(64), 'hex'));

      await jest.advanceTimersByTimeAsync(1_000);
      await jest.advanceTimersByTimeAsync(2_000);

      await expect(promise).resolves.toEqual({ provider: 'opentimestamps', evidence: expectedBytes });
    });

    describe('createTimestampOnce (integración con el paquete javascript-opentimestamps)', () => {
      it('construye el DetachedTimestampFile a partir del hash y devuelve los bytes serializados', async () => {
        fromHashMock.mockReturnValue({
          serializeToBytes: () => new Uint8Array([1, 2, 3]),
        });
        stampMock.mockResolvedValue(undefined);

        const result = await (provider as unknown as OpenTimestampProviderInternals).createTimestampOnce(
          Buffer.from('d'.repeat(64), 'hex'),
        );

        expect(fromHashMock).toHaveBeenCalled();
        expect(stampMock).toHaveBeenCalled();
        expect(Buffer.compare(result, Buffer.from([1, 2, 3]))).toBe(0);
      });
    });
  });

  describe('verifyTimestamp', () => {
    const hash = Buffer.from('e'.repeat(64), 'hex');
    const evidence = Buffer.from('evidence-bytes');

    beforeEach(() => {
      fromHashMock.mockReturnValue({ kind: 'original' });
      deserializeMock.mockReturnValue({ kind: 'stamped' });
    });

    it('devuelve verified:true con la fecha de la atestación más temprana cuando hay atestaciones', async () => {
      verifyMock.mockResolvedValue({
        bitcoin: { timestamp: 1_700_000_100, height: 800_100 },
        litecoin: { timestamp: 1_700_000_000, height: 900_100 },
      });

      const result = await provider.verifyTimestamp({ hash, evidence });

      expect(result.verified).toBe(true);
      expect(result.timestamp).toEqual(new Date(1_700_000_000 * 1000));
      expect(result.details).toEqual({
        bitcoin: { timestamp: 1_700_000_100, height: 800_100 },
        litecoin: { timestamp: 1_700_000_000, height: 900_100 },
      });
    });

    it('devuelve verified:false con reason pending_confirmation cuando no hay atestaciones', async () => {
      verifyMock.mockResolvedValue({});

      const result = await provider.verifyTimestamp({ hash, evidence });

      expect(result).toEqual({ verified: false, reason: 'pending_confirmation', details: {} });
    });

    it('captura errores de deserialize/verify y devuelve verified:false sin propagar la excepción', async () => {
      deserializeMock.mockImplementation(() => {
        throw new Error('bytes de evidencia corruptos');
      });

      const result = await provider.verifyTimestamp({ hash, evidence });

      expect(result).toEqual({ verified: false, reason: 'bytes de evidencia corruptos' });
    });
  });
});
