import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TracksService } from './tracks.service';
import { Track } from './entities/track.entity';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { User } from 'src/users/entities/user.entity';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import { TrackResponseDto } from './dto/track-response.dto';
import { EventBusService } from 'src/shared/events/event-bus.service';

describe('TracksService - findAllTracksService', () => {
  let service: TracksService;
  let trackRepository: any;

  // Mock de los resultados
  const mockTracks = [{ id: '1', title: 'Track 1', isAvailable: true }];
  const mockTotal = 1;

  const mockTrackRepository = {
    findAndCount: jest.fn().mockResolvedValue([mockTracks, mockTotal]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TracksService,
        { provide: getRepositoryToken(Track), useValue: mockTrackRepository },
        { provide: getRepositoryToken(MusicalGenre), useValue: {} }, // Mocks vacíos si no se usan en este test
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: EventBusService, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<TracksService>(TracksService);
    trackRepository = module.get(getRepositoryToken(Track));
  });

  it('debe filtrar por genreId y devolver estructura paginada', async () => {
    const mockUser = { id: 'user-123', planType: UserPlanType.PLAN_AUTOR };
    const options = { params: { genreId: 'genre-99', limit: 10, offset: 0 } };

    const result = await service.findAllTracksService(options as any, mockUser as any);

    // 1. Verificar estructura del retorno
    expect(result).toEqual({ data: mockTracks.map(t => TrackResponseDto.fromEntity(t as any)), total: mockTotal });

    // 2. Verificar que el filtro se construyó correctamente
    expect(trackRepository.findAndCount).toHaveBeenCalledWith({
      where: {
        isAvailable: true, // Valor por defecto implementado
        genre: { id: 'genre-99' }, // Lógica de relación corregida
        authors: { id: 'user-123' }, // Restricción para no-admin
      },
      take: 10,
      skip: 0,
      relations: expect.any(Array),
    });
  });

  it('debe permitir al ADMIN ver tracks de otros autores', async () => {
    const adminUser = { id: 'admin-1', planType: UserPlanType.ADMIN };
    const options = { params: { isAvailable: false } };

    await service.findAllTracksService(options as any, adminUser as any);

    expect(trackRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ authors: { id: 'admin-1' } }), // Admin no se auto-filtra
      })
    );
  });
});

describe('TracksService - createTrackService', () => {
  let service: TracksService;
  let eventBus: { emit: jest.Mock };

  const mockGenre = { id: 'genre-1', genre: 'Rock', subGenre: [] };
  const mockAuthors = [{ id: 'author-1' }];
  const savedTrack = {
    id: 'track-1',
    audioKey: 'develop/tracks/audio/file.mp3',
    audioUrl: 'https://cdn/file.mp3',
  };

  const mockTrackRepository = {
    create: jest.fn((input) => input),
    save: jest.fn().mockResolvedValue(savedTrack),
    findOne: jest.fn().mockResolvedValue(savedTrack),
  };

  const mockGenreRepository = {
    findOne: jest.fn().mockResolvedValue(mockGenre),
  };

  const mockUsersRepository = {
    find: jest.fn().mockResolvedValue(mockAuthors),
  };

  const createTrackInput = {
    title: 'Nueva canción',
    genreId: 'genre-1',
    authorsIds: ['author-1'],
    audioKey: 'develop/tracks/audio/file.mp3',
    audioUrl: 'https://cdn/file.mp3',
    language: 'Español',
    lyric: 'letra',
    isGospel: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TracksService,
        { provide: getRepositoryToken(Track), useValue: mockTrackRepository },
        { provide: getRepositoryToken(MusicalGenre), useValue: mockGenreRepository },
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        { provide: EventBusService, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<TracksService>(TracksService);
    eventBus = module.get(EventBusService);
    jest.clearAllMocks();
    mockTrackRepository.create.mockImplementation((input) => input);
    mockTrackRepository.save.mockResolvedValue(savedTrack);
    mockTrackRepository.findOne.mockResolvedValue(savedTrack);
    mockGenreRepository.findOne.mockResolvedValue(mockGenre);
    mockUsersRepository.find.mockResolvedValue(mockAuthors);
  });

  it('emite track.created con el trackId, audioKey y requestedByUserId tras guardar', async () => {
    await service.createTrackService(createTrackInput as any, 'requester-1');

    expect(eventBus.emit).toHaveBeenCalledWith('track.created', {
      trackId: savedTrack.id,
      audioKey: savedTrack.audioKey,
      requestedByUserId: 'requester-1',
    });
  });

  it('emite track.created sin requestedByUserId cuando no se provee', async () => {
    await service.createTrackService(createTrackInput as any);

    expect(eventBus.emit).toHaveBeenCalledWith('track.created', {
      trackId: savedTrack.id,
      audioKey: savedTrack.audioKey,
      requestedByUserId: undefined,
    });
  });
});
