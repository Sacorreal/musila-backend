import { NotFoundException } from '@nestjs/common';
import { CollectiveManagementSocietyService } from './collective-management-society.service';
import { CollectiveManagementSocietyStatus } from './entities/collective-management-society-status.enum';

describe('CollectiveManagementSocietyService', () => {
  let service: CollectiveManagementSocietyService;
  let repo: any;
  let qb: any;

  beforeEach(() => {
    qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    repo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'cms-1', ...data })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => qb),
    };

    service = new CollectiveManagementSocietyService(repo);
  });

  describe('findOne', () => {
    it('lanza NotFoundException si la sociedad no existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('filtra por país cuando se pasa el parámetro country', async () => {
      await service.findAll({ country: 'CO', limit: 10, offset: 0 } as any);
      expect(qb.andWhere).toHaveBeenCalledWith('cms.isoCountryCode = :country', { country: 'CO' });
    });

    it('filtra por búsqueda libre cuando se pasa search', async () => {
      await service.findAll({ search: 'SAYCO', limit: 10, offset: 0 } as any);
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(cms.acronym ILIKE :search OR cms.officialName ILIKE :search)',
        { search: '%SAYCO%' },
      );
    });
  });

  describe('deprecate', () => {
    it('marca la sociedad como DEPRECATED en vez de eliminarla', async () => {
      repo.findOne.mockResolvedValue({ id: 'cms-1', status: CollectiveManagementSocietyStatus.ACTIVE });

      const result = await service.deprecate('cms-1');

      expect(result.status).toBe(CollectiveManagementSocietyStatus.DEPRECATED);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: CollectiveManagementSocietyStatus.DEPRECATED }),
      );
    });
  });
});
