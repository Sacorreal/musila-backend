import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/entities/user-role.enum';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let tracksRepository: { findAndCount: jest.Mock };
  let musicalGenresRepository: { findAndCount: jest.Mock };
  let usersRepository: { findAndCount: jest.Mock };

  beforeEach(async () => {
    tracksRepository = { findAndCount: jest.fn() };
    musicalGenresRepository = { findAndCount: jest.fn() };
    usersRepository = { findAndCount: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: getRepositoryToken(Track), useValue: tracksRepository },
        { provide: getRepositoryToken(MusicalGenre), useValue: musicalGenresRepository },
        { provide: getRepositoryToken(User), useValue: usersRepository },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns empty results without hitting the database when "q" is blank', async () => {
    const result = await service.searchService({ q: '  ', limit: 20, offset: 0 });

    expect(result).toEqual({
      tracks: [],
      musicalGenres: [],
      authors: [],
      meta: {
        limit: 20,
        tracksTotal: 0,
        genresTotal: 0,
        authorsTotal: 0,
        hasMoreTracks: false,
        hasMoreAuthors: false,
        hasMoreGenres: false,
      },
    });
    expect(tracksRepository.findAndCount).not.toHaveBeenCalled();
  });

  it('maps tracks/authors to DTOs, caps "take" and computes hasMoreX from totals', async () => {
    const track = {
      id: 't1',
      title: 'Rock anthem',
      genre: { id: 'g1', genre: 'Rock' },
      authors: [{ id: 'u1', name: 'Ana', lastName: 'Pérez', role: UserRole.AUTOR }],
      isAvailable: true,
      isGospel: false,
    } as unknown as Track;

    const author = {
      id: 'u2',
      name: 'Carlos',
      lastName: 'Gómez',
      avatarUrl: 'https://cdn/a.png',
      email: 'carlos@example.com',
      role: UserRole.CANTAUTOR,
    } as unknown as User;

    const genre = { id: 'g1', genre: 'Rock' } as MusicalGenre;

    tracksRepository.findAndCount.mockResolvedValue([[track], 120]);
    musicalGenresRepository.findAndCount.mockResolvedValue([[genre], 1]);
    usersRepository.findAndCount.mockResolvedValue([[author], 3]);

    const result = await service.searchService({ q: 'rock', limit: 200, offset: 0 });

    // limit is capped at 50 regardless of what the client requests
    expect(tracksRepository.findAndCount.mock.calls[0][0]).toMatchObject({ take: 50 });

    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0].id).toBe('t1');

    expect(result.authors).toEqual([
      { id: 'u2', name: 'Carlos', lastName: 'Gómez', avatarUrl: 'https://cdn/a.png', role: UserRole.CANTAUTOR },
    ]);
    expect(result.authors[0]).not.toHaveProperty('email');

    expect(result.musicalGenres).toEqual([genre]);

    expect(result.meta).toEqual({
      limit: 50,
      tracksTotal: 120,
      genresTotal: 1,
      authorsTotal: 3,
      hasMoreTracks: true,
      hasMoreAuthors: false,
      hasMoreGenres: false,
    });
  });
});
