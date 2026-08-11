// StepUpAuthService importa TotpService, que a su vez importa otplib (ESM).
// Mockeamos otplib para evitar cargar su cadena de módulos ESM en el test.
jest.mock('otplib', () => ({
  generateSecret: () => 'SECRET',
  generateURI: () => 'otpauth://totp/x',
  generateSync: () => '123456',
  verifySync: () => ({ valid: true }),
}));

import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogService } from 'src/users/audit-log.service';
import { StepUpGrant } from '../entities/step-up-grant.entity';
import { UserPasskey } from '../entities/user-passkey.entity';
import { MfaMethod } from '../entities/mfa-method.enum';
import { ChallengeStoreService } from './challenge-store.service';
import { WebauthnService } from './webauthn.service';
import { TotpService } from './totp.service';
import { StepUpAuthService } from './step-up-auth.service';

describe('StepUpAuthService', () => {
  let service: StepUpAuthService;
  let grantRepo: { save: jest.Mock; create: jest.Mock; findOne: jest.Mock };
  let totpService: { verify: jest.Mock };

  beforeEach(async () => {
    grantRepo = {
      save: jest.fn((v: Partial<StepUpGrant>) => Promise.resolve(v)),
      create: jest.fn((v: Partial<StepUpGrant>) => v),
      findOne: jest.fn(),
    };
    totpService = { verify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StepUpAuthService,
        { provide: getRepositoryToken(StepUpGrant), useValue: grantRepo },
        { provide: getRepositoryToken(UserPasskey), useValue: { find: jest.fn(), findOne: jest.fn(), save: jest.fn() } },
        { provide: WebauthnService, useValue: {} },
        { provide: ChallengeStoreService, useValue: {} },
        { provide: TotpService, useValue: totpService },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(StepUpAuthService);
  });

  it('verifyTotp emite un grant cuando el código es válido', async () => {
    totpService.verify.mockResolvedValue(true);

    const result = await service.verifyTotp('user-1', 'account.change_password', '123456', {});

    expect(result.grantedUntil).toBeInstanceOf(Date);
    expect(grantRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', scope: 'account.change_password', method: MfaMethod.TOTP }),
    );
  });

  it('verifyTotp rechaza un código inválido', async () => {
    totpService.verify.mockResolvedValue(false);
    await expect(
      service.verifyTotp('user-1', 'scope', 'bad', {}),
    ).rejects.toThrow();
    expect(grantRepo.save).not.toHaveBeenCalled();
  });

  it('assertValidGrant lanza 403 STEP_UP_REQUIRED sin grant vigente', async () => {
    grantRepo.findOne.mockResolvedValue(null);
    await expect(
      service.assertValidGrant('user-1', 'account.change_password'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assertValidGrant pasa cuando hay un grant vigente', async () => {
    grantRepo.findOne.mockResolvedValue({ id: 'g-1' });
    await expect(
      service.assertValidGrant('user-1', 'account.change_password'),
    ).resolves.toBeUndefined();
  });
});
