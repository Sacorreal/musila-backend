const fromHashMock = jest.fn();
const stampMock = jest.fn();

jest.mock(
  'javascript-opentimestamps',
  () => ({
    DetachedTimestampFile: {
      fromHash: (...args: unknown[]) => fromHashMock(...args) as unknown,
    },
    Ops: { OpSHA256: jest.fn() },
    stamp: (...args: unknown[]) => stampMock(...args) as unknown,
  }),
  { virtual: true },
);

import { OpenTimestampsService, StampResult } from './opentimestamps.service';

type OpenTimestampsServiceInternals = { stampOnce: (hash: string) => Promise<StampResult> };

describe('OpenTimestampsService', () => {
  let service: OpenTimestampsService;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new OpenTimestampsService();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('devuelve el resultado del primer intento exitoso sin reintentar', async () => {
    const expected = { otsBytes: Buffer.from('ots-bytes') };
    jest.spyOn(service as any, 'stampOnce').mockResolvedValue(expected);

    const result = await service.stamp('a'.repeat(64));

    expect(result).toBe(expected);
    expect((service as any).stampOnce as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('reintenta hasta 3 veces con backoff exponencial antes de rendirse', async () => {
    const stampOnceSpy = jest
      .spyOn(service as any, 'stampOnce')
      .mockRejectedValue(new Error('calendar server down'));

    const promise = service.stamp('b'.repeat(64));
    const assertion = expect(promise).rejects.toThrow('calendar server down');

    // 3 reintentos: backoff 1s, 2s, 4s
    await jest.advanceTimersByTimeAsync(1_000);
    await jest.advanceTimersByTimeAsync(2_000);
    await jest.advanceTimersByTimeAsync(4_000);

    await assertion;
    expect(stampOnceSpy).toHaveBeenCalledTimes(4); // 1 intento inicial + 3 reintentos
  });

  it('resuelve si un intento posterior tiene éxito tras fallos previos', async () => {
    const expected = { otsBytes: Buffer.from('ots-bytes') };
    jest
      .spyOn(service as any, 'stampOnce')
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce(expected);

    const promise = service.stamp('c'.repeat(64));

    await jest.advanceTimersByTimeAsync(1_000);
    await jest.advanceTimersByTimeAsync(2_000);

    await expect(promise).resolves.toBe(expected);
  });

  describe('stampOnce (integración con el paquete javascript-opentimestamps)', () => {
    it('construye el DetachedTimestampFile a partir del hash y devuelve los bytes serializados', async () => {
      fromHashMock.mockReturnValue({
        serializeToBytes: () => new Uint8Array([1, 2, 3]),
      });
      stampMock.mockResolvedValue(undefined);

      const result = await (service as unknown as OpenTimestampsServiceInternals).stampOnce('d'.repeat(64));

      expect(fromHashMock).toHaveBeenCalled();
      expect(stampMock).toHaveBeenCalled();
      expect(Buffer.compare(result.otsBytes, Buffer.from([1, 2, 3]))).toBe(0);
    });
  });
});
