import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuditLogService } from 'src/users/audit-log.service';
import { RecoveryCode } from '../entities/recovery-code.entity';
import { RecoveryCodeService } from './recovery-code.service';

describe('RecoveryCodeService', () => {
  let service: RecoveryCodeService;
  let repo: {
    delete: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    count: jest.Mock;
  };
  let auditLog: { log: jest.Mock };

  beforeEach(async () => {
    repo = {
      delete: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((v: Partial<RecoveryCode>) => v),
      save: jest.fn().mockResolvedValue(undefined),
      find: jest.fn(),
      count: jest.fn(),
    };
    auditLog = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecoveryCodeService,
        { provide: getRepositoryToken(RecoveryCode), useValue: repo },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = module.get(RecoveryCodeService);
  });

  it('genera 10 códigos, elimina los anteriores y solo persiste hashes', async () => {
    const codes = await service.generate('user-1', '1.1.1.1');

    expect(codes).toHaveLength(10);
    expect(repo.delete).toHaveBeenCalledWith({ userId: 'user-1' });
    // Ningún código en claro debe coincidir con lo guardado (se guarda el hash).
    const saved = (repo.save.mock.calls[0] as [RecoveryCode[]])[0];
    saved.forEach((entity, i) => {
      expect(entity.codeHash).not.toEqual(codes[i]);
    });
    expect(auditLog.log).toHaveBeenCalledWith(
      'user-1',
      'RECOVERY_CODE_GENERATED',
      expect.any(Object),
      '1.1.1.1',
    );
  });

  it('regenerar audita como REGENERATED e invalida los previos', async () => {
    await service.regenerate('user-1');
    expect(repo.delete).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(auditLog.log).toHaveBeenCalledWith(
      'user-1',
      'RECOVERY_CODES_REGENERATED',
      expect.any(Object),
      undefined,
    );
  });

  it('consume un código válido una sola vez', async () => {
    const hash = await bcrypt.hash('abcd-1234', 10);
    const candidate = { id: 'rc-1', userId: 'user-1', codeHash: hash, usedAt: null };
    repo.find.mockResolvedValue([candidate]);

    const ok = await service.verifyAndConsume('user-1', 'abcd-1234');

    expect(ok).toBe(true);
    expect(candidate.usedAt).toBeInstanceOf(Date);
    expect(repo.save).toHaveBeenCalledWith(candidate);
    expect(auditLog.log).toHaveBeenCalledWith('user-1', 'RECOVERY_CODE_USED', {}, undefined);
  });

  it('rechaza un código incorrecto', async () => {
    const hash = await bcrypt.hash('abcd-1234', 10);
    repo.find.mockResolvedValue([{ id: 'rc-1', userId: 'user-1', codeHash: hash, usedAt: null }]);

    const ok = await service.verifyAndConsume('user-1', 'wrong-code');

    expect(ok).toBe(false);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
