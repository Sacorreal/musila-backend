import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TracksService } from './tracks.service';
import { Track } from './entities/track.entity';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/entities/user-role.enum';

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
      ],
    }).compile();

    service = module.get<TracksService>(TracksService);
    trackRepository = module.get(getRepositoryToken(Track));
  });

  it('debe filtrar por genreId y devolver estructura paginada', async () => {
    const mockUser = { id: 'user-123', role: UserRole.INTERPRETE };
    const options = { params: { genreId: 'genre-99', limit: 10, offset: 0 } };

    const result = await service.findAllTracksService(options as any, mockUser as any);

    // 1. Verificar estructura del retorno
    expect(result).toEqual({ data: mockTracks, total: mockTotal });

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
    const adminUser = { id: 'admin-1', role: UserRole.ADMIN };
    const options = { params: { isAvailable: false } };

    await service.findAllTracksService(options as any, adminUser as any);

    expect(trackRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ authors: { id: 'admin-1' } }), // Admin no se auto-filtra
      })
    );
  });
});
