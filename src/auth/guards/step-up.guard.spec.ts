// StepUpGuard -> StepUpAuthService -> TotpService -> otplib (ESM). Mockeamos
// otplib para evitar cargar su cadena de módulos ESM en el test.
jest.mock('otplib', () => ({
  generateSecret: () => 'SECRET',
  generateURI: () => 'otpauth://totp/x',
  generateSync: () => '123456',
  verifySync: () => ({ valid: true }),
}));

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StepUpAuthService } from '../services/step-up-auth.service';
import { StepUpGuard } from './step-up.guard';

describe('StepUpGuard', () => {
  let guard: StepUpGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let stepUpAuthService: { assertValidGrant: jest.Mock };

  const buildContext = (user?: { id: string }) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    stepUpAuthService = { assertValidGrant: jest.fn() };

    guard = new StepUpGuard(
      reflector as unknown as Reflector,
      stepUpAuthService as unknown as StepUpAuthService,
    );
  });

  it('permite el acceso si la ruta no lleva @RequireStepUp', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await guard.canActivate(buildContext({ id: 'user-1' }));

    expect(result).toBe(true);
    expect(stepUpAuthService.assertValidGrant).not.toHaveBeenCalled();
  });

  it('lanza ForbiddenException si no hay usuario autenticado', async () => {
    reflector.getAllAndOverride.mockReturnValue('account.change_password');

    await expect(guard.canActivate(buildContext(undefined))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('permite el acceso si existe un grant vigente para el scope', async () => {
    reflector.getAllAndOverride.mockReturnValue('account.change_password');
    stepUpAuthService.assertValidGrant.mockResolvedValue(undefined);

    const result = await guard.canActivate(buildContext({ id: 'user-1' }));

    expect(result).toBe(true);
    expect(stepUpAuthService.assertValidGrant).toHaveBeenCalledWith(
      'user-1',
      'account.change_password',
    );
  });

  it('propaga el 403 STEP_UP_REQUIRED si no hay grant vigente', async () => {
    reflector.getAllAndOverride.mockReturnValue('account.change_password');
    stepUpAuthService.assertValidGrant.mockRejectedValue(
      new ForbiddenException({ code: 'STEP_UP_REQUIRED' }),
    );

    await expect(guard.canActivate(buildContext({ id: 'user-1' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
