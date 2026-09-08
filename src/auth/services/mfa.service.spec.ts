// MfaService importa TotpService, que a su vez importa otplib (ESM). Mockeamos
// otplib para evitar cargar su cadena de módulos ESM en el test (mismo motivo
// que en step-up-auth.service.spec.ts).
jest.mock('otplib', () => ({
  generateSecret: () => 'SECRET',
  generateURI: () => 'otpauth://totp/x',
  generateSync: () => '123456',
  verifySync: () => ({ valid: true }),
}));

import { MfaService } from './mfa.service';
import { PasskeyService } from './passkey.service';
import { TotpService } from './totp.service';
import { RecoveryCodeService } from './recovery-code.service';
import { OrganizationSecurityPolicyService } from 'src/organizations/organization-security-policy.service';

describe('MfaService', () => {
  let service: MfaService;
  let passkeyService: { countActive: jest.Mock };
  let totpService: { isEnabled: jest.Mock };
  let recoveryCodeService: { countUnused: jest.Mock };
  let orgPolicyService: { get: jest.Mock };

  const defaultPolicy = {
    organizationId: 'org-1',
    mfaRequired: false,
    passkeyRequired: false,
    totpAllowed: true,
    recoveryCodesRequired: false,
  };

  beforeEach(() => {
    passkeyService = { countActive: jest.fn().mockResolvedValue(0) };
    totpService = { isEnabled: jest.fn().mockResolvedValue(false) };
    recoveryCodeService = { countUnused: jest.fn().mockResolvedValue(0) };
    orgPolicyService = { get: jest.fn().mockResolvedValue({ ...defaultPolicy }) };

    service = new MfaService(
      passkeyService as unknown as PasskeyService,
      totpService as unknown as TotpService,
      recoveryCodeService as unknown as RecoveryCodeService,
      orgPolicyService as unknown as OrganizationSecurityPolicyService,
    );
  });

  describe('getStatus', () => {
    it('mfaEnabled es true si hay al menos una passkey activa', async () => {
      passkeyService.countActive.mockResolvedValue(1);

      const status = await service.getStatus('user-1');

      expect(status.mfaEnabled).toBe(true);
      expect(status.availableMethods).toContain('PASSKEY');
    });

    it('mfaEnabled es true si TOTP está habilitado, aunque no haya passkeys', async () => {
      totpService.isEnabled.mockResolvedValue(true);

      const status = await service.getStatus('user-1');

      expect(status.mfaEnabled).toBe(true);
      expect(status.availableMethods).toEqual(['TOTP']);
    });

    it('no incluye organizationPolicy si no se pasa organizationId', async () => {
      const status = await service.getStatus('user-1');
      expect(status.organizationPolicy).toBeUndefined();
    });
  });

  describe('evaluateCompliance', () => {
    it('satisfied=true cuando la política no exige nada', async () => {
      const result = await service.evaluateCompliance('user-1', 'org-1');
      expect(result).toEqual({ satisfied: true, missing: [] });
    });

    it('exige PASSKEY cuando passkeyRequired=true y el usuario no tiene ninguna', async () => {
      orgPolicyService.get.mockResolvedValue({ ...defaultPolicy, passkeyRequired: true });

      const result = await service.evaluateCompliance('user-1', 'org-1');

      expect(result.satisfied).toBe(false);
      expect(result.missing).toEqual(['PASSKEY']);
    });

    it('passkeyRequired=true se satisface si el usuario ya tiene una passkey activa', async () => {
      orgPolicyService.get.mockResolvedValue({ ...defaultPolicy, passkeyRequired: true });
      passkeyService.countActive.mockResolvedValue(1);

      const result = await service.evaluateCompliance('user-1', 'org-1');

      expect(result.satisfied).toBe(true);
    });

    it('mfaRequired=true (sin passkeyRequired) se satisface con TOTP', async () => {
      orgPolicyService.get.mockResolvedValue({ ...defaultPolicy, mfaRequired: true });
      totpService.isEnabled.mockResolvedValue(true);

      const result = await service.evaluateCompliance('user-1', 'org-1');

      expect(result.satisfied).toBe(true);
    });

    it('mfaRequired=true sin ningún factor exige MFA', async () => {
      orgPolicyService.get.mockResolvedValue({ ...defaultPolicy, mfaRequired: true });

      const result = await service.evaluateCompliance('user-1', 'org-1');

      expect(result.satisfied).toBe(false);
      expect(result.missing).toEqual(['MFA']);
    });

    it('passkeyRequired=true implica mfaRequired=true en la evaluación aunque la política no lo marque explícito', async () => {
      orgPolicyService.get.mockResolvedValue({
        ...defaultPolicy,
        passkeyRequired: true,
        mfaRequired: false,
      });
      passkeyService.countActive.mockResolvedValue(1);

      const result = await service.evaluateCompliance('user-1', 'org-1');

      expect(result.satisfied).toBe(true);
    });

    it('recoveryCodesRequired=true exige códigos de recuperación sin consumir', async () => {
      orgPolicyService.get.mockResolvedValue({ ...defaultPolicy, recoveryCodesRequired: true });

      const result = await service.evaluateCompliance('user-1', 'org-1');

      expect(result.satisfied).toBe(false);
      expect(result.missing).toEqual(['RECOVERY_CODES']);
    });

    it('acumula PASSKEY y RECOVERY_CODES cuando ambos faltan', async () => {
      orgPolicyService.get.mockResolvedValue({
        ...defaultPolicy,
        passkeyRequired: true,
        recoveryCodesRequired: true,
      });

      const result = await service.evaluateCompliance('user-1', 'org-1');

      expect(result.satisfied).toBe(false);
      expect(result.missing).toEqual(expect.arrayContaining(['PASSKEY', 'RECOVERY_CODES']));
    });
  });
});
