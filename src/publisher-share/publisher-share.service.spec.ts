import { BadRequestException } from '@nestjs/common';
import { PublisherShareService } from './publisher-share.service';
import { OrganizationType } from 'src/organizations/entities/organization-type.enum';

describe('PublisherShareService', () => {
  let service: PublisherShareService;
  let sharesRepo: any;
  let rosterRepo: any;
  let orgRepo: any;
  let eventBus: { emit: jest.Mock };

  beforeEach(() => {
    sharesRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
    };
    rosterRepo = { find: jest.fn().mockResolvedValue([]) };
    orgRepo = { findOne: jest.fn().mockResolvedValue({ id: 'pub-1', type: OrganizationType.PUBLISHER }) };
    eventBus = { emit: jest.fn() };

    service = new PublisherShareService(sharesRepo, rosterRepo, orgRepo, eventBus as any);
  });

  describe('resolveForUser', () => {
    it("resuelve el Publisher's Share de las publishers con la config activada", async () => {
      rosterRepo.find.mockResolvedValue([{ organizationId: 'pub-1', organization: { name: 'Sony' } }]);
      sharesRepo.find.mockResolvedValue([{ organizationId: 'pub-1', enabled: true, percentage: 20 }]);

      const resolved = await service.resolveForUser('user-1');

      expect(resolved).toEqual([
        {
          organizationId: 'pub-1',
          organizationName: 'Sony',
          organizationIpiNumber: null,
          percentage: 20,
          contractUrl: null,
          confirmedAt: null,
        },
      ]);
    });

    it('excluye publishers sin el share activado o con porcentaje 0', async () => {
      rosterRepo.find.mockResolvedValue([
        { organizationId: 'pub-1', organization: { name: 'Sony' } },
        { organizationId: 'pub-2', organization: { name: 'Warner' } },
      ]);
      // pub-1 no viene (enabled=false filtrado en la query); pub-2 con porcentaje 0
      sharesRepo.find.mockResolvedValue([{ organizationId: 'pub-2', enabled: true, percentage: 0 }]);

      const resolved = await service.resolveForUser('user-1');

      expect(resolved).toEqual([]);
    });

    it('devuelve vacío cuando el usuario no pertenece a ninguna publisher', async () => {
      rosterRepo.find.mockResolvedValue([]);

      const resolved = await service.resolveForUser('user-1');

      expect(resolved).toEqual([]);
      expect(sharesRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('upsertShares', () => {
    it("rechaza activar el Publisher's Share con porcentaje 0", async () => {
      rosterRepo.find.mockResolvedValue([{ userId: 'user-1' }]);

      await expect(
        service.upsertShares('pub-1', [{ userId: 'user-1', enabled: true, percentage: 0 }]),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza configurar a un usuario que no es miembro activo del roster', async () => {
      rosterRepo.find.mockResolvedValue([{ userId: 'otro' }]);

      await expect(
        service.upsertShares('pub-1', [{ userId: 'user-1', enabled: true, percentage: 20 }]),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza organizaciones que no son publisher', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'label-1', type: OrganizationType.LABEL });

      await expect(service.upsertShares('label-1', [])).rejects.toThrow(BadRequestException);
    });
  });
});
