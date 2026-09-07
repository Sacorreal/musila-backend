import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrganizationSecurityPolicy } from './entities/organization-security-policy.entity';
import { Organization } from './entities/organization.entity';
import { OrganizationSecurityPolicyService } from './organization-security-policy.service';

describe('OrganizationSecurityPolicyService', () => {
  let service: OrganizationSecurityPolicyService;
  let policyRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let orgRepo: { exists: jest.Mock };

  beforeEach(async () => {
    policyRepo = {
      findOne: jest.fn(),
      create: jest.fn((v: Partial<OrganizationSecurityPolicy>) => v),
      save: jest.fn((v: Partial<OrganizationSecurityPolicy>) => Promise.resolve(v)),
    };
    orgRepo = { exists: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationSecurityPolicyService,
        { provide: getRepositoryToken(OrganizationSecurityPolicy), useValue: policyRepo },
        { provide: getRepositoryToken(Organization), useValue: orgRepo },
      ],
    }).compile();

    service = module.get(OrganizationSecurityPolicyService);
  });

  it('get devuelve un default seguro cuando no hay política configurada (B2B policy-driven)', async () => {
    policyRepo.findOne.mockResolvedValue(null);

    const view = await service.get('org-1');

    expect(view).toEqual({
      organizationId: 'org-1',
      mfaRequired: false,
      passkeyRequired: false,
      totpAllowed: true,
      recoveryCodesRequired: false,
    });
  });

  it('get lanza NotFound si la organización no existe', async () => {
    policyRepo.findOne.mockResolvedValue(null);
    orgRepo.exists.mockResolvedValue(false);
    await expect(service.get('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('exigir Passkey implica exigir MFA (coherencia)', async () => {
    policyRepo.findOne.mockResolvedValue(null);

    const view = await service.update('org-1', { passkeyRequired: true });

    expect(view.passkeyRequired).toBe(true);
    expect(view.mfaRequired).toBe(true);
  });

  it('evaluatePasskeyRequired refleja la política persistida', async () => {
    policyRepo.findOne.mockResolvedValue({
      organizationId: 'org-1',
      mfaRequired: true,
      passkeyRequired: true,
      totpAllowed: false,
      recoveryCodesRequired: true,
    } as OrganizationSecurityPolicy);

    expect(await service.evaluatePasskeyRequired('org-1')).toBe(true);
    expect(await service.evaluateMfaRequired('org-1')).toBe(true);
  });
});
