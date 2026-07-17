import { withTimeout } from './with-timeout.util';

describe('withTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resuelve con el valor de la promesa si termina antes del timeout', async () => {
    const promise = withTimeout(Promise.resolve('done'), 1000);

    await expect(promise).resolves.toBe('done');
  });

  it('rechaza con el mensaje de timeout si la promesa no resuelve a tiempo', async () => {
    const neverResolves = new Promise(() => undefined);

    const promise = withTimeout(neverResolves, 1000, 'se agotó el tiempo');
    const assertion = expect(promise).rejects.toThrow('se agotó el tiempo');

    await jest.advanceTimersByTimeAsync(1000);

    await assertion;
  });

  it('propaga el rechazo original de la promesa si falla antes del timeout', async () => {
    const promise = withTimeout(Promise.reject(new Error('boom')), 1000);

    await expect(promise).rejects.toThrow('boom');
  });
});
