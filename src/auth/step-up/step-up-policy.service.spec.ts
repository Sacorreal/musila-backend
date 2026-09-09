import { MfaMethod } from '../entities/mfa-method.enum';
import { StepUpSensitivity } from './step-up-sensitivity.enum';
import { StepUpPolicyService } from './step-up-policy.service';

describe('StepUpPolicyService', () => {
  const service = new StepUpPolicyService();

  it('resuelve un scope STANDARD como Passkey o TOTP, reutilizable', () => {
    const policy = service.resolve('account.change_password');

    expect(policy.sensitivity).toBe(StepUpSensitivity.STANDARD);
    expect(policy.allowedMethods).toEqual(
      expect.arrayContaining([MfaMethod.PASSKEY, MfaMethod.TOTP]),
    );
    expect(policy.oneTimeUse).toBe(false);
  });

  it('resuelve un scope CRITICAL como solo Passkey, de un solo uso', () => {
    const policy = service.resolve('platform.admin.create');

    expect(policy.sensitivity).toBe(StepUpSensitivity.CRITICAL);
    expect(policy.allowedMethods).toEqual([MfaMethod.PASSKEY]);
    expect(policy.oneTimeUse).toBe(true);
  });

  it('trata un scope desconocido como STANDARD por defecto', () => {
    const policy = service.resolve('dominio.no_listado');

    expect(policy.sensitivity).toBe(StepUpSensitivity.STANDARD);
    expect(policy.oneTimeUse).toBe(false);
  });
});
