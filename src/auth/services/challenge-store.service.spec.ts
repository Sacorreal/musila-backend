import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebauthnChallenge } from '../entities/webauthn-challenge.entity';
import { WebauthnChallengeType } from '../entities/webauthn-challenge-type.enum';
import { ChallengeStoreService } from './challenge-store.service';

describe('ChallengeStoreService', () => {
  let service: ChallengeStoreService;
  let repo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; delete: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn((v: Partial<WebauthnChallenge>) => v),
      save: jest.fn((v: Partial<WebauthnChallenge>) => Promise.resolve(v)),
      findOne: jest.fn(),
      delete: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengeStoreService,
        { provide: getRepositoryToken(WebauthnChallenge), useValue: repo },
      ],
    }).compile();
    service = module.get(ChallengeStoreService);
  });

  it('consume un challenge válido marcándolo como usado (anti-replay)', async () => {
    const record = {
      challenge: 'abc',
      type: WebauthnChallengeType.REGISTRATION,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: undefined as Date | undefined,
    };
    repo.findOne.mockResolvedValue(record);

    const result = await service.consume('abc', WebauthnChallengeType.REGISTRATION);

    expect(result.consumedAt).toBeInstanceOf(Date);
    expect(repo.save).toHaveBeenCalledWith(record);
  });

  it('rechaza un challenge ya consumido', async () => {
    repo.findOne.mockResolvedValue({
      challenge: 'abc',
      type: WebauthnChallengeType.REGISTRATION,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: new Date(),
    });
    await expect(
      service.consume('abc', WebauthnChallengeType.REGISTRATION),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza un challenge expirado', async () => {
    repo.findOne.mockResolvedValue({
      challenge: 'abc',
      type: WebauthnChallengeType.REGISTRATION,
      expiresAt: new Date(Date.now() - 1000),
      consumedAt: undefined,
    });
    await expect(
      service.consume('abc', WebauthnChallengeType.REGISTRATION),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza un challenge inexistente', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(
      service.consume('nope', WebauthnChallengeType.AUTHENTICATION),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
