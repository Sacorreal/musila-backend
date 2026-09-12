import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { SocietyAffiliationService } from './society-affiliation.service';
import { SocietyAffiliationStatus } from './entities/society-affiliation-status.enum';
import { SocietyAffiliationRightsType } from './entities/society-affiliation-rights-type.enum';
import { SocietyAffiliationTerritoryMode } from './entities/society-affiliation-territory-mode.enum';

describe('SocietyAffiliationService', () => {
  let service: SocietyAffiliationService;
  let repo: any;
  let authorizationService: any;
  let eventBus: any;
  let cmsService: any;

  const user = { id: 'author-1' } as any;

  beforeEach(() => {
    repo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'aff-1', ...data })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };
    authorizationService = {
      checkResource: jest.fn().mockResolvedValue({ allowed: true }),
    };
    eventBus = { emit: jest.fn() };
    cmsService = { findOne: jest.fn().mockResolvedValue({ id: 'cms-sayco' }) };

    service = new SocietyAffiliationService(repo, authorizationService, eventBus, cmsService);
  });

  describe('create', () => {
    const dto = {
      collectiveManagementSocietyId: 'cms-sayco',
      rightsType: SocietyAffiliationRightsType.PR,
      territoryMode: SocietyAffiliationTerritoryMode.SPECIFIC_COUNTRIES,
      territoryCountries: ['CO'],
    } as any;

    it('crea Author X + SAYCO + PR + CO cuando no hay duplicado', async () => {
      const result = await service.create('author-1', dto, user);

      expect(result.status).toBe(SocietyAffiliationStatus.ACTIVE);
      expect(cmsService.findOne).toHaveBeenCalledWith('cms-sayco');
      expect(eventBus.emit).toHaveBeenCalledWith('society-affiliation.created', expect.any(Object));
    });

    it('rechaza un duplicado activo de la misma combinación sociedad+derecho+territorio', async () => {
      repo.find.mockResolvedValue([
        { territoryMode: SocietyAffiliationTerritoryMode.SPECIFIC_COUNTRIES, territoryCountries: ['CO'] },
      ]);

      await expect(service.create('author-1', dto, user)).rejects.toThrow(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('permite la misma sociedad con distinto rightsType', async () => {
      await expect(service.create('author-1', { ...dto, rightsType: SocietyAffiliationRightsType.MR }, user)).resolves.toBeDefined();
    });

    it('permite la misma sociedad y derecho en distinto país específico', async () => {
      repo.find.mockResolvedValue([
        { territoryMode: SocietyAffiliationTerritoryMode.SPECIFIC_COUNTRIES, territoryCountries: ['MX'] },
      ]);
      await expect(service.create('author-1', { ...dto, territoryCountries: ['CO'] }, user)).resolves.toBeDefined();
    });

    it('rechaza WORLDWIDE cuando ya existe una afiliación en un país específico', async () => {
      repo.find.mockResolvedValue([
        { territoryMode: SocietyAffiliationTerritoryMode.SPECIFIC_COUNTRIES, territoryCountries: ['CO'] },
      ]);
      await expect(
        service.create('author-1', { ...dto, territoryMode: SocietyAffiliationTerritoryMode.WORLDWIDE, territoryCountries: undefined }, user),
      ).rejects.toThrow(ConflictException);
    });

    it('permite "mundial excepto EE.UU." junto con otra afiliación exclusiva de EE.UU. (caso de uso real)', async () => {
      // Ya existe SAYCO = mundial excepto US
      repo.find.mockResolvedValue([
        { territoryMode: SocietyAffiliationTerritoryMode.WORLDWIDE_EXCEPT, territoryCountries: ['US'] },
      ]);

      await expect(
        service.create(
          'author-1',
          { ...dto, territoryMode: SocietyAffiliationTerritoryMode.SPECIFIC_COUNTRIES, territoryCountries: ['US'] },
          user,
        ),
      ).resolves.toBeDefined();
    });

    it('rechaza "mundial excepto EE.UU." si ya existe una afiliación en un país no excluido (ej. CO)', async () => {
      repo.find.mockResolvedValue([
        { territoryMode: SocietyAffiliationTerritoryMode.SPECIFIC_COUNTRIES, territoryCountries: ['CO'] },
      ]);

      await expect(
        service.create(
          'author-1',
          { ...dto, territoryMode: SocietyAffiliationTerritoryMode.WORLDWIDE_EXCEPT, territoryCountries: ['US'] },
          user,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('exige al menos un país cuando el modo es SPECIFIC_COUNTRIES o WORLDWIDE_EXCEPT', async () => {
      await expect(
        service.create('author-1', { ...dto, territoryCountries: [] }, user),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(
          'author-1',
          { ...dto, territoryMode: SocietyAffiliationTerritoryMode.WORLDWIDE_EXCEPT, territoryCountries: [] },
          user,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza crear afiliaciones para un autor ajeno (ownership)', async () => {
      authorizationService.checkResource.mockResolvedValue({ allowed: false });

      await expect(service.create('other-author', dto, user)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('end', () => {
    it('finaliza la afiliación sin eliminarla', async () => {
      repo.findOne.mockResolvedValue({
        id: 'aff-1',
        authorId: 'author-1',
        status: SocietyAffiliationStatus.ACTIVE,
        collectiveManagementSocietyId: 'cms-sayco',
        rightsType: SocietyAffiliationRightsType.PR,
      });

      const result = await service.end('author-1', 'aff-1', {}, user);

      expect(result.status).toBe(SocietyAffiliationStatus.ENDED);
      expect(result.validTo).toBeDefined();
      expect(repo.save).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith('society-affiliation.ended', expect.any(Object));
    });
  });
});
