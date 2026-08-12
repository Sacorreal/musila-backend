import { BadRequestException } from '@nestjs/common';
import { PublisherCoauthorService } from './publisher-coauthor.service';
import { CoauthorRole } from 'src/splits/entities/coauthor-role.enum';
import { OrganizationType } from 'src/organizations/entities/organization-type.enum';

describe('PublisherCoauthorService', () => {
  let service: PublisherCoauthorService;
  let defaultsRepo: any;
  let rosterRepo: any;
  let orgRepo: any;

  beforeEach(() => {
    defaultsRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
    };
    rosterRepo = { find: jest.fn().mockResolvedValue([]) };
    orgRepo = { findOne: jest.fn().mockResolvedValue({ id: 'pub-1', type: OrganizationType.PUBLISHER }) };

    service = new PublisherCoauthorService(defaultsRepo, rosterRepo, orgRepo);
  });

  describe('resolveForUser', () => {
    it('resuelve la coautoría por defecto de las publishers con la config activada', async () => {
      rosterRepo.find.mockResolvedValue([
        { organizationId: 'pub-1', organization: { name: 'Sony' } },
      ]);
      defaultsRepo.find.mockResolvedValue([
        { organizationId: 'pub-1', enabled: true, role: CoauthorRole.ARREGLISTA, percentage: 20 },
      ]);

      const resolved = await service.resolveForUser('user-1');

      expect(resolved).toEqual([
        { organizationId: 'pub-1', organizationName: 'Sony', role: CoauthorRole.ARREGLISTA, percentage: 20 },
      ]);
    });

    it('excluye publishers sin la coautoría activada o con porcentaje 0', async () => {
      rosterRepo.find.mockResolvedValue([
        { organizationId: 'pub-1', organization: { name: 'Sony' } },
        { organizationId: 'pub-2', organization: { name: 'Warner' } },
      ]);
      // pub-1 no viene (enabled=false filtrado en la query); pub-2 con porcentaje 0
      defaultsRepo.find.mockResolvedValue([
        { organizationId: 'pub-2', enabled: true, role: CoauthorRole.COMPOSITOR, percentage: 0 },
      ]);

      const resolved = await service.resolveForUser('user-1');

      expect(resolved).toEqual([]);
    });

    it('devuelve vacío cuando el usuario no pertenece a ninguna publisher', async () => {
      rosterRepo.find.mockResolvedValue([]);

      const resolved = await service.resolveForUser('user-1');

      expect(resolved).toEqual([]);
      expect(defaultsRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('upsertRosterDefaults', () => {
    it('rechaza activar la coautoría con porcentaje 0', async () => {
      rosterRepo.find.mockResolvedValue([{ userId: 'user-1' }]);

      await expect(
        service.upsertRosterDefaults('pub-1', [
          { userId: 'user-1', enabled: true, role: CoauthorRole.COMPOSITOR, percentage: 0 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza configurar a un usuario que no es miembro activo del roster', async () => {
      rosterRepo.find.mockResolvedValue([{ userId: 'otro' }]);

      await expect(
        service.upsertRosterDefaults('pub-1', [
          { userId: 'user-1', enabled: true, role: CoauthorRole.COMPOSITOR, percentage: 20 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza organizaciones que no son publisher', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'label-1', type: OrganizationType.LABEL });

      await expect(
        service.upsertRosterDefaults('label-1', []),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
