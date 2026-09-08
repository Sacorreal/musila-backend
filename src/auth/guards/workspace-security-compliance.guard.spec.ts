// WorkspaceSecurityComplianceGuard -> MfaService -> TotpService -> otplib (ESM).
// Mockeamos otplib para evitar cargar su cadena de módulos ESM en el test.
jest.mock('otplib', () => ({
  generateSecret: () => 'SECRET',
  generateURI: () => 'otpauth://totp/x',
  generateSync: () => '123456',
  verifySync: () => ({ valid: true }),
}));

import { ExecutionContext, ForbiddenException, HttpException } from '@nestjs/common';
import { MembershipService } from 'src/organizations/membership.service';
import { AuditLogService } from 'src/users/audit-log.service';
import { MfaService } from '../services/mfa.service';
import {
  SECURITY_POLICY_NOT_SATISFIED_CODE,
  WorkspaceSecurityComplianceGuard,
} from './workspace-security-compliance.guard';

describe('WorkspaceSecurityComplianceGuard', () => {
  let guard: WorkspaceSecurityComplianceGuard;
  let mfaService: { evaluateCompliance: jest.Mock };
  let membershipService: { findActivePlatformMemberships: jest.Mock };
  let auditLog: { log: jest.Mock };

  const buildContext = (params: Record<string, string>, user?: { id: string }) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ params, user, path: '/test' }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    mfaService = { evaluateCompliance: jest.fn() };
    membershipService = { findActivePlatformMemberships: jest.fn().mockResolvedValue([]) };
    auditLog = { log: jest.fn() };

    guard = new WorkspaceSecurityComplianceGuard(
      mfaService as unknown as MfaService,
      membershipService as unknown as MembershipService,
      auditLog as unknown as AuditLogService,
    );
  });

  it('lanza ForbiddenException si no hay usuario autenticado', async () => {
    await expect(guard.canActivate(buildContext({}))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('caso B2B: permite el acceso si la política está satisfecha', async () => {
    mfaService.evaluateCompliance.mockResolvedValue({ satisfied: true, missing: [] });

    const result = await guard.canActivate(buildContext({ organizationId: 'org-1' }, { id: 'user-1' }));

    expect(result).toBe(true);
    expect(mfaService.evaluateCompliance).toHaveBeenCalledWith('user-1', 'org-1');
    expect(membershipService.findActivePlatformMemberships).not.toHaveBeenCalled();
  });

  it('caso B2B: bloquea con 403 y código SECURITY_POLICY_NOT_SATISFIED si falta cumplir la política', async () => {
    mfaService.evaluateCompliance.mockResolvedValue({ satisfied: false, missing: ['PASSKEY'] });

    const promise = guard.canActivate(buildContext({ organizationId: 'org-1' }, { id: 'user-1' }));

    await expect(promise).rejects.toBeInstanceOf(HttpException);
    await expect(promise).rejects.toMatchObject({
      response: expect.objectContaining({ code: SECURITY_POLICY_NOT_SATISFIED_CODE, missing: ['PASSKEY'] }),
    });
    expect(auditLog.log).toHaveBeenCalledWith(
      'user-1',
      'SECURITY_POLICY_BLOCKED_ACCESS',
      expect.objectContaining({ organizationId: 'org-1', missing: ['PASSKEY'] }),
    );
  });

  it('caso staff: resuelve organizationId vía membership de plataforma cuando no hay :organizationId en la ruta', async () => {
    membershipService.findActivePlatformMemberships.mockResolvedValue([
      { organizationId: 'platform-org' },
    ]);
    mfaService.evaluateCompliance.mockResolvedValue({ satisfied: true, missing: [] });

    const result = await guard.canActivate(buildContext({}, { id: 'staff-1' }));

    expect(result).toBe(true);
    expect(mfaService.evaluateCompliance).toHaveBeenCalledWith('staff-1', 'platform-org');
  });

  it('deja pasar cuando el usuario no es miembro B2B ni staff (no es un guard de autorización)', async () => {
    membershipService.findActivePlatformMemberships.mockResolvedValue([]);

    const result = await guard.canActivate(buildContext({}, { id: 'user-1' }));

    expect(result).toBe(true);
    expect(mfaService.evaluateCompliance).not.toHaveBeenCalled();
  });
});
