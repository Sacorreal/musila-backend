import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { CreatorIdService } from './creator-id.service';

describe('CreatorIdService', () => {
  let service: CreatorIdService;
  let usersRepository: { exist: jest.Mock };

  beforeEach(async () => {
    usersRepository = { exist: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorIdService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
      ],
    }).compile();

    service = module.get<CreatorIdService>(CreatorIdService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('genera un MCID válido cuando el primer intento no colisiona', async () => {
    usersRepository.exist.mockResolvedValue(false);

    const mcid = await service.generateUnique();

    expect(mcid).toMatch(/^MC-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    expect(usersRepository.exist).toHaveBeenCalledTimes(1);
  });

  it('reintenta hasta encontrar un MCID libre si hay colisiones', async () => {
    usersRepository.exist
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const mcid = await service.generateUnique();

    expect(mcid).toMatch(/^MC-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    expect(usersRepository.exist).toHaveBeenCalledTimes(3);
  });

  it('lanza ConflictException si se agotan los 5 intentos', async () => {
    usersRepository.exist.mockResolvedValue(true);

    await expect(service.generateUnique()).rejects.toThrow(ConflictException);
    expect(usersRepository.exist).toHaveBeenCalledTimes(5);
  });
});
