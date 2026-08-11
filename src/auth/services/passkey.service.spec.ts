import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogService } from 'src/users/audit-log.service';
import { UsersService } from 'src/users/users.service';
import { UserPasskey } from '../entities/user-passkey.entity';
import { ChallengeStoreService } from './challenge-store.service';
import { WebauthnService } from './webauthn.service';
import { PasskeyService } from './passkey.service';

/** Construye un clientDataJSON base64url con el challenge dado. */
const clientData = (challenge: string): string =>
  Buffer.from(JSON.stringify({ challenge })).toString('base64url');

describe('PasskeyService', () => {
  let service: PasskeyService;
  let passkeyRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    count: jest.Mock;
  };
  let challengeStore: { consume: jest.Mock; create: jest.Mock };
  let webauthn: { verifyAuthentication: jest.Mock };

  beforeEach(async () => {
    passkeyRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((v: Partial<UserPasskey>) => Promise.resolve(v)),
      create: jest.fn((v: Partial<UserPasskey>) => v),
      count: jest.fn(),
    };
    challengeStore = { consume: jest.fn(), create: jest.fn() };
    webauthn = { verifyAuthentication: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasskeyService,
        { provide: getRepositoryToken(UserPasskey), useValue: passkeyRepo },
        { provide: WebauthnService, useValue: webauthn },
        { provide: ChallengeStoreService, useValue: challengeStore },
        { provide: UsersService, useValue: {} },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(PasskeyService);
  });

  it('list devuelve un resumen de las passkeys activas', async () => {
    passkeyRepo.find.mockResolvedValue([
      { id: 'p1', name: 'MacBook', deviceType: 'multiDevice', createdAt: new Date(), lastUsedAt: null },
    ]);

    const result = await service.list('user-1');

    expect(result).toEqual([
      expect.objectContaining({ id: 'p1', name: 'MacBook', deviceType: 'multiDevice' }),
    ]);
  });

  it('revoke marca revokedAt y audita PASSKEY_REVOKED', async () => {
    const passkey = { id: 'p1', userId: 'user-1', revokedAt: undefined } as UserPasskey;
    passkeyRepo.findOne.mockResolvedValue(passkey);

    await service.revoke('user-1', 'p1', 'user-1', { ip: '1.1.1.1' });

    expect(passkey.revokedAt).toBeInstanceOf(Date);
    expect(passkeyRepo.save).toHaveBeenCalledWith(passkey);
  });

  it('login con passkey revocada es denegado', async () => {
    challengeStore.consume.mockResolvedValue({ challenge: 'abc' });
    passkeyRepo.findOne.mockResolvedValue({
      id: 'p1',
      userId: 'user-1',
      credentialId: 'cred-1',
      revokedAt: new Date(),
    });

    await expect(
      service.verifyAuthentication(
        { id: 'cred-1', response: { clientDataJSON: clientData('abc') } } as never,
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(webauthn.verifyAuthentication).not.toHaveBeenCalled();
  });

  it('login válido actualiza signCount y lastUsedAt y devuelve el userId', async () => {
    challengeStore.consume.mockResolvedValue({ challenge: 'abc' });
    const passkey = {
      id: 'p1',
      userId: 'user-1',
      credentialId: 'cred-1',
      publicKey: 'pk',
      signCount: 4,
      revokedAt: undefined,
      lastUsedAt: undefined,
    } as unknown as UserPasskey;
    passkeyRepo.findOne.mockResolvedValue(passkey);
    webauthn.verifyAuthentication.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 5 },
    });

    const result = await service.verifyAuthentication(
      { id: 'cred-1', response: { clientDataJSON: clientData('abc') } } as never,
      {},
    );

    expect(result).toEqual({ userId: 'user-1' });
    expect(passkey.signCount).toBe(5);
    expect(passkey.lastUsedAt).toBeInstanceOf(Date);
  });
});
