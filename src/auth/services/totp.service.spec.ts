// Mock de otplib para aislar el test de su cadena de imports ESM y de la
// criptografía real: aquí verificamos la orquestación (cifrado del secreto,
// confirmación y verificación), no la implementación TOTP de la librería.
jest.mock('otplib', () => ({
  generateSecret: () => 'JBSWY3DPEHPK3PXP',
  generateURI: ({ label, issuer }: { label: string; issuer: string }) =>
    `otpauth://totp/${issuer}:${label}?secret=JBSWY3DPEHPK3PXP&issuer=${issuer}`,
  generateSync: () => 'VALIDCODE',
  verifySync: ({ token }: { token: string }) => ({ valid: token === 'VALIDCODE' }),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from 'src/users/audit-log.service';
import { UsersService } from 'src/users/users.service';
import { UserTotpFactor } from '../entities/user-totp-factor.entity';
import { SecretCipherService } from '../crypto/secret-cipher.service';
import { WebauthnConfig } from '../config/webauthn.config';
import { TotpService } from './totp.service';

// Clave AES-256 (32 bytes) en hex para el cifrado del secreto en tests.
const TEST_KEY = '0'.repeat(64);

describe('TotpService', () => {
  let service: TotpService;
  let store: UserTotpFactor | null;

  beforeEach(async () => {
    store = null;
    const repo = {
      findOne: jest.fn((): Promise<UserTotpFactor | null> => Promise.resolve(store)),
      create: jest.fn((v: Partial<UserTotpFactor>) => v),
      save: jest.fn((v: Partial<UserTotpFactor>): Promise<UserTotpFactor> => {
        store = { ...(store ?? {}), ...v } as UserTotpFactor;
        return Promise.resolve(store);
      }),
      remove: jest.fn((): Promise<void> => {
        store = null;
        return Promise.resolve();
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TotpService,
        SecretCipherService,
        { provide: getRepositoryToken(UserTotpFactor), useValue: repo },
        { provide: ConfigService, useValue: { get: () => TEST_KEY } },
        { provide: UsersService, useValue: { findOneUserService: () => Promise.resolve({ email: 'u@musila.co' }) } },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
        { provide: WebauthnConfig, useValue: { rpName: 'Musila' } },
      ],
    }).compile();

    service = module.get(TotpService);
  });

  it('setup genera QR y guarda el secreto cifrado (nunca en claro)', async () => {
    const result = await service.setup('user-1');

    expect(result.qrCodeDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(store?.secretEncrypted).toBeDefined();
    // El secreto persistido está cifrado: no coincide con la clave manual.
    expect(store?.secretEncrypted).not.toContain(result.manualEntryKey);
  });

  it('confirm valida un código y marca el factor como confirmado', async () => {
    await service.setup('user-1');

    await service.confirm('user-1', 'VALIDCODE');

    expect(store?.confirmedAt).toBeInstanceOf(Date);
    expect(await service.isEnabled('user-1')).toBe(true);
  });

  it('confirm rechaza un código inválido', async () => {
    await service.setup('user-1');
    await expect(service.confirm('user-1', '000000')).rejects.toThrow();
  });

  it('verify devuelve false si el factor no está confirmado', async () => {
    await service.setup('user-1');
    expect(await service.verify('user-1', 'VALIDCODE')).toBe(false);
  });
});
