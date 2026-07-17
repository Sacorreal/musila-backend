import { retryWithBackoff } from './retry-with-backoff.util';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('devuelve el resultado sin reintentar si la función tiene éxito al primer intento', async () => {
    const fn = jest.fn().mockResolvedValue('ok');

    const result = await retryWithBackoff(fn, { retries: 3, baseDelayMs: 1000 });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('reintenta hasta tener éxito, respetando el backoff exponencial', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('ok');
    const onRetry = jest.fn();

    const promise = retryWithBackoff(fn, { retries: 3, baseDelayMs: 1000, onRetry });

    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);

    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error));
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error));
  });

  it('lanza el último error tras agotar los reintentos', async () => {
    const lastError = new Error('final failure');
    const fn = jest.fn().mockRejectedValue(lastError);

    const promise = retryWithBackoff(fn, { retries: 2, baseDelayMs: 100 });
    const assertion = expect(promise).rejects.toBe(lastError);

    await jest.advanceTimersByTimeAsync(100);
    await jest.advanceTimersByTimeAsync(200);

    await assertion;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('respeta el maxDelayMs como techo del backoff', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok');
    const onRetry = jest.fn();

    const promise = retryWithBackoff(fn, {
      retries: 1,
      baseDelayMs: 10_000,
      maxDelayMs: 5_000,
      onRetry,
    });

    await jest.advanceTimersByTimeAsync(5_000);

    await expect(promise).resolves.toBe('ok');
  });
});
