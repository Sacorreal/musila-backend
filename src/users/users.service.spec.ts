import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { StorageService } from '../shared/storage/storage.service';
import { CreatorIdService } from '../creator-id/creator-id.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(MusicalGenre), useValue: {} },
        { provide: StorageService, useValue: {} },
        { provide: CreatorIdService, useValue: { generateUnique: jest.fn() } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
