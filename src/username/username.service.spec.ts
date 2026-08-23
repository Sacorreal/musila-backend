import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { UsernameService } from './username.service';

describe('UsernameService', () => {
  let service: UsernameService;
  let qb: {
    where: jest.Mock;
    andWhere: jest.Mock;
    getCount: jest.Mock;
  };
  let usersRepository: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
    };
    usersRepository = { createQueryBuilder: jest.fn().mockReturnValue(qb) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsernameService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
      ],
    }).compile();

    service = module.get<UsernameService>(UsernameService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('normaliza quitando "@" inicial y espacios', () => {
    expect(service.normalize('  @Nombre123  ')).toBe('Nombre123');
    expect(service.normalize('Nombre123')).toBe('Nombre123');
  });

  it('reporta disponible cuando no hay coincidencias', async () => {
    qb.getCount.mockResolvedValue(0);

    const available = await service.isAvailable('Nombre123');

    expect(available).toBe(true);
    expect(qb.where).toHaveBeenCalledWith(
      'LOWER(u.username) = LOWER(:username)',
      { username: 'Nombre123' },
    );
    expect(qb.andWhere).not.toHaveBeenCalled();
  });

  it('reporta no disponible de forma insensible a mayusculas/minusculas', async () => {
    qb.getCount.mockResolvedValue(1);

    const available = await service.isAvailable('nombre123');

    expect(available).toBe(false);
  });

  it('excluye al propio usuario al validar disponibilidad', async () => {
    qb.getCount.mockResolvedValue(0);

    await service.isAvailable('nombre123', 'user-1');

    expect(qb.andWhere).toHaveBeenCalledWith('u.id != :excludeUserId', {
      excludeUserId: 'user-1',
    });
  });
});
