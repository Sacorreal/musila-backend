import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { StaffAuditInterceptor } from './staff-audit.interceptor';

interface FakeUser {
  id: string;
  name: string;
}

function buildContext(
  user: FakeUser | undefined,
  request: Record<string, unknown> = {},
): ExecutionContext {
  const req = { user, method: 'POST', params: {}, query: {}, body: {}, headers: {}, ...request };
  const res = { statusCode: 200 };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function buildHandler(observable = of('ok')): CallHandler {
  return { handle: () => observable };
}

describe('StaffAuditInterceptor', () => {
  let interceptor: StaffAuditInterceptor;
  let reflector: Reflector;
  let eventBus: { emit: jest.Mock };

  beforeEach(async () => {
    eventBus = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StaffAuditInterceptor, Reflector, { provide: EventBusService, useValue: eventBus }],
    }).compile();

    interceptor = module.get(StaffAuditInterceptor);
    reflector = module.get(Reflector);
  });

  it('no emite ningún evento si la ruta no tiene @AuditAction()', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = buildContext({ id: 'u1', name: 'A' });

    interceptor.intercept(ctx, buildHandler()).subscribe(() => {
      expect(eventBus.emit).not.toHaveBeenCalled();
      done();
    });
  });

  it('emite staff.audit.captured con outcome success cuando el handler resuelve', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('blog:articles:publish');
    const ctx = buildContext({ id: 'u1', name: 'A' });

    interceptor.intercept(ctx, buildHandler()).subscribe(() => {
      expect(eventBus.emit).toHaveBeenCalledWith(
        'staff.audit.captured',
        expect.objectContaining({
          actorUserId: 'u1',
          module: 'blog',
          action: 'articles:publish',
          outcome: 'success',
        }),
      );
      done();
    });
  });

  it('emite outcome failure y relanza el error cuando el handler falla', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('blog:articles:publish');
    const ctx = buildContext({ id: 'u1', name: 'A' });
    const error = { status: 403, message: 'nope' };

    interceptor.intercept(ctx, buildHandler(throwError(() => error))).subscribe({
      error: (err) => {
        expect(err).toBe(error);
        expect(eventBus.emit).toHaveBeenCalledWith(
          'staff.audit.captured',
          expect.objectContaining({ outcome: 'failure', statusCode: 403 }),
        );
        done();
      },
    });
  });

  it('redacta claves sensibles del body antes de emitir', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('staff-members:invite');
    const ctx = buildContext({ id: 'u1', name: 'A' }, { body: { email: 'a@b.com', password: 'secret' } });

    interceptor.intercept(ctx, buildHandler()).subscribe(() => {
      const payload = eventBus.emit.mock.calls[0][1] as {
        metadata: { body: Record<string, unknown> };
      };
      expect(payload.metadata.body.password).toBe('[REDACTED]');
      expect(payload.metadata.body.email).toBe('a@b.com');
      done();
    });
  });
});
