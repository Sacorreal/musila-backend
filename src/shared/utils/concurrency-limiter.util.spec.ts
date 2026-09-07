import { ConcurrencyLimiter } from './concurrency-limiter.util';

describe('ConcurrencyLimiter', () => {
  it('no ejecuta más tareas que el límite configurado al mismo tiempo', async () => {
    const limiter = new ConcurrencyLimiter(2);
    let active = 0;
    let maxActive = 0;

    const makeTask = () =>
      limiter.run(async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 20));
        active--;
      });

    await Promise.all([makeTask(), makeTask(), makeTask(), makeTask(), makeTask()]);

    expect(maxActive).toBe(2);
    expect(active).toBe(0);
  });

  it('libera el slot aunque la tarea lance un error, y propaga el error', async () => {
    const limiter = new ConcurrencyLimiter(1);

    await expect(
      limiter.run(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    let ran = false;
    await limiter.run(async () => {
      ran = true;
    });

    expect(ran).toBe(true);
  });

  it('ejecuta todas las tareas encoladas eventualmente', async () => {
    const limiter = new ConcurrencyLimiter(1);
    const order: number[] = [];

    await Promise.all([
      limiter.run(async () => {
        order.push(1);
      }),
      limiter.run(async () => {
        order.push(2);
      }),
      limiter.run(async () => {
        order.push(3);
      }),
    ]);

    expect(order).toEqual([1, 2, 3]);
  });

  it('lanza si el límite configurado es menor a 1', () => {
    expect(() => new ConcurrencyLimiter(0)).toThrow(
      'ConcurrencyLimiter requiere un límite mayor o igual a 1',
    );
  });
});
