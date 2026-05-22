import { Test, TestingModule } from '@nestjs/testing';
import { TracksController } from './tracks.controller';
import { TracksService } from './tracks.service';
import { UserRole } from 'src/users/entities/user-role.enum';

describe('TracksController', () => {
  let controller: TracksController;
  let service: TracksService;

  // Mock del resultado esperado (basado en el nuevo DTO paginado)
  const mockPaginatedResult = {
    data: [{ id: '1', title: 'Test Track', isAvailable: true }],
    total: 1,
  };

  // Mock del servicio
  const mockTracksService = {
    findAllTracksService: jest.fn().mockResolvedValue(mockPaginatedResult),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TracksController],
      providers: [
        {
          provide: TracksService,
          useValue: mockTracksService,
        },
      ],
    }).compile();

    controller = module.get<TracksController>(TracksController);
    service = module.get<TracksService>(TracksService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('findAllTracksController', () => {
    it('debe llamar al servicio con los parámetros correctos y devolver el resultado paginado', async () => {
      const mockUser = { id: 'user-uuid', role: UserRole.INTERPRETE };
      const mockFilterDto = { genreId: 'genre-uuid', limit: 10, offset: 0 };

      const result = await controller.findAllTracksController(
        mockUser as any,
        mockFilterDto as any,
      );

      // 1. Verificar que el servicio fue llamado con la estructura { params }
      expect(service.findAllTracksService).toHaveBeenCalledWith(
        { params: mockFilterDto },
        mockUser,
      );

      // 2. Verificar que el controlador retorna lo que el servicio entrega
      expect(result).toEqual(mockPaginatedResult);
      expect(result.data).toBeInstanceOf(Array);
      expect(typeof result.total).toBe('number');
    });
  });
});