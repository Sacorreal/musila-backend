import { PublisherCommissionService } from './publisher-commission.service';

describe('PublisherCommissionService', () => {
  let service: PublisherCommissionService;
  let policyRepo: any;
  let rosterCommissionRepo: any;
  let rosterRepo: any;
  let orgRepo: any;

  beforeEach(() => {
    policyRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    rosterCommissionRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    rosterRepo = { find: jest.fn().mockResolvedValue([]) };
    orgRepo = { findOne: jest.fn() };

    service = new PublisherCommissionService(policyRepo, rosterCommissionRepo, rosterRepo, orgRepo);
  });

  describe('resolveSnapshot', () => {
    it('devuelve las tarifas de los miembros afiliados a publishers con comisión activada', async () => {
      rosterRepo.find.mockResolvedValue([{ organizationId: 'pub-1', userId: 'user-1' }]);
      policyRepo.find.mockResolvedValue([{ organizationId: 'pub-1', commissionEnabled: true }]);
      rosterCommissionRepo.find.mockResolvedValue([{ organizationId: 'pub-1', userId: 'user-1', percentage: 12.5 }]);

      const snapshot = await service.resolveSnapshot(['user-1', 'user-2']);

      expect(snapshot).toEqual([
        { beneficiaryUserId: 'user-1', publisherOrganizationId: 'pub-1', percentage: 12.5 },
      ]);
    });

    it('excluye organizaciones con la comisión desactivada', async () => {
      rosterRepo.find.mockResolvedValue([{ organizationId: 'pub-1', userId: 'user-1' }]);
      policyRepo.find.mockResolvedValue([{ organizationId: 'pub-1', commissionEnabled: false }]);
      rosterCommissionRepo.find.mockResolvedValue([{ organizationId: 'pub-1', userId: 'user-1', percentage: 10 }]);

      const snapshot = await service.resolveSnapshot(['user-1']);

      expect(snapshot).toEqual([]);
    });

    it('excluye miembros con porcentaje 0 o sin tarifa configurada', async () => {
      rosterRepo.find.mockResolvedValue([
        { organizationId: 'pub-1', userId: 'user-1' },
        { organizationId: 'pub-1', userId: 'user-2' },
      ]);
      policyRepo.find.mockResolvedValue([{ organizationId: 'pub-1', commissionEnabled: true }]);
      rosterCommissionRepo.find.mockResolvedValue([{ organizationId: 'pub-1', userId: 'user-1', percentage: 0 }]);

      const snapshot = await service.resolveSnapshot(['user-1', 'user-2']);

      expect(snapshot).toEqual([]);
    });

    it('devuelve vacío cuando no hay beneficiarios', async () => {
      const snapshot = await service.resolveSnapshot([]);
      expect(snapshot).toEqual([]);
      expect(rosterRepo.find).not.toHaveBeenCalled();
    });
  });
});
