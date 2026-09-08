import { RequestsStatus } from 'src/requested-tracks/entities/requests-status.enum';
import { BuyerDashboardService } from './buyer-dashboard.service';

/** QueryBuilder mock encadenable: todos los métodos de encadenado devuelven
 * el mismo objeto; los métodos terminales (getRawOne/getRawMany/getCount) se
 * configuran por test. */
function createQueryBuilderMock() {
  const qb: any = {};
  const chainMethods = [
    'select',
    'addSelect',
    'innerJoin',
    'leftJoin',
    'where',
    'andWhere',
    'groupBy',
    'addGroupBy',
    'orderBy',
    'limit',
  ];
  chainMethods.forEach((method) => {
    qb[method] = jest.fn().mockReturnValue(qb);
  });
  qb.getRawOne = jest.fn();
  qb.getRawMany = jest.fn().mockResolvedValue([]);
  qb.getCount = jest.fn().mockResolvedValue(0);
  return qb;
}

const buildRosterMember = (userId: string, overrides: Partial<{ name: string; lastName: string; email: string }> = {}) => ({
  userId,
  user: {
    name: overrides.name ?? 'Laura',
    lastName: overrides.lastName ?? 'Restrepo',
    email: overrides.email ?? 'laura@example.com',
  },
});

describe('BuyerDashboardService', () => {
  let service: BuyerDashboardService;
  let requestedTrackRepo: any;
  let rosterRepo: any;
  let trackPlaysService: any;
  let qb: ReturnType<typeof createQueryBuilderMock>;

  beforeEach(() => {
    qb = createQueryBuilderMock();
    requestedTrackRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    rosterRepo = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };
    trackPlaysService = {
      getStatsForListeners: jest.fn().mockResolvedValue({ totalPlays: 0, distinctTracksPlayed: 0 }),
      getTopTracksForListeners: jest.fn().mockResolvedValue([]),
      getMostActiveListener: jest.fn().mockResolvedValue(null),
    };

    service = new BuyerDashboardService(requestedTrackRepo, rosterRepo, trackPlaysService);
  });

  describe('getOverview', () => {
    it('retorna todo en ceros/null y no ejecuta ninguna query de agregación cuando el roster está vacío', async () => {
      rosterRepo.find.mockResolvedValue([]);

      const result = await service.getOverview('org-1');

      expect(result).toEqual({
        playsThisMonth: 0,
        playsLastMonth: 0,
        playsChangePct: 0,
        licensesThisMonth: 0,
        licensesLastMonth: 0,
        licensesChangePct: 0,
        licensedValueThisMonth: 0,
        currency: 'COP',
        activeRosterMembers: 0,
        topTrackThisMonth: null,
        mostActiveRosterMember: null,
        monthlyLicenseTrend: [],
      });
      expect(requestedTrackRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(trackPlaysService.getStatsForListeners).not.toHaveBeenCalled();
      expect(rosterRepo.count).not.toHaveBeenCalled();
    });

    it('calcula playsChangePct/licensesChangePct incluyendo el caso previous=0', async () => {
      rosterRepo.find.mockResolvedValue([buildRosterMember('user-1')]);
      rosterRepo.count.mockResolvedValue(1);
      trackPlaysService.getStatsForListeners
        .mockResolvedValueOnce({ totalPlays: 10, distinctTracksPlayed: 3 }) // mes actual
        .mockResolvedValueOnce({ totalPlays: 0, distinctTracksPlayed: 0 }); // mes anterior
      qb.getCount.mockResolvedValueOnce(4).mockResolvedValueOnce(0); // licencias: actual, anterior
      qb.getRawOne.mockResolvedValue({ total: '0' }); // sumApprovedLicenseValue
      qb.getRawMany.mockResolvedValue([]); // monthlyLicenseTrend

      const result = await service.getOverview('org-1');

      expect(result.playsChangePct).toBe(0); // previous=0 -> no distingue "sin dato previo" de "sin cambio"
      expect(result.licensesChangePct).toBe(0);
      expect(result.playsThisMonth).toBe(10);
      expect(result.licensesThisMonth).toBe(4);
      expect(result.activeRosterMembers).toBe(1);
    });

    it('arma topTrackThisMonth y mostActiveRosterMember resolviendo el nombre desde el roster', async () => {
      rosterRepo.find.mockResolvedValue([buildRosterMember('user-1', { name: 'Laura', lastName: 'Restrepo' })]);
      rosterRepo.count.mockResolvedValue(1);
      trackPlaysService.getStatsForListeners.mockResolvedValue({ totalPlays: 5, distinctTracksPlayed: 2 });
      trackPlaysService.getTopTracksForListeners.mockResolvedValue([
        { trackId: 'track-1', title: 'Amanecer', plays: 5 },
      ]);
      trackPlaysService.getMostActiveListener.mockResolvedValue({ userId: 'user-1', plays: 5 });
      qb.getCount.mockResolvedValue(0);
      qb.getRawOne.mockResolvedValue({ total: '0' });
      qb.getRawMany.mockResolvedValue([]);

      const result = await service.getOverview('org-1');

      expect(result.topTrackThisMonth).toEqual({ trackId: 'track-1', title: 'Amanecer', plays: 5 });
      expect(result.mostActiveRosterMember).toEqual({ userId: 'user-1', name: 'Laura Restrepo', plays: 5 });
    });
  });

  describe('getLicenses', () => {
    it('retorna month/total:0/data:[] sin consultar cuando el roster está vacío', async () => {
      rosterRepo.find.mockResolvedValue([]);

      const result = await service.getLicenses('org-1', '2026-09');

      expect(result).toEqual({ month: '2026-09', total: 0, data: [] });
      expect(requestedTrackRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('filtra por status=APROBADA sin considerar licensePaymentStatus', async () => {
      rosterRepo.find.mockResolvedValue([{ userId: 'user-1' }]);
      qb.getRawMany.mockResolvedValue([
        {
          requestId: 'req-1',
          trackId: 'track-1',
          trackTitle: 'Amanecer',
          ownerId: 'owner-1',
          ownerFirstName: 'Juan',
          ownerLastName: 'Pérez',
          ownerEmail: 'juan@example.com',
          requesterId: 'user-1',
          requesterFirstName: 'Laura',
          requesterLastName: 'Restrepo',
          requesterEmail: 'laura@example.com',
          licenseType: 'sincronizacion',
          licensePrice: '2100000',
          licensePaymentStatus: 'pending',
          approvedAt: '2026-09-05T00:00:00.000Z',
          createdAt: '2026-08-20T00:00:00.000Z',
        },
      ]);

      const result = await service.getLicenses('org-1', '2026-09');

      expect(qb.where).toHaveBeenCalledWith('rt.status = :aprobada', { aprobada: RequestsStatus.APROBADA });
      const whereAndAndWhereCalls = [...qb.where.mock.calls, ...qb.andWhere.mock.calls];
      const referencesPaymentStatusFilter = whereAndAndWhereCalls.some(([expr]: [string]) =>
        expr.includes('license_payment_status ='),
      );
      expect(referencesPaymentStatusFilter).toBe(false);

      expect(result.total).toBe(1);
      expect(result.data[0]).toEqual({
        requestId: 'req-1',
        trackId: 'track-1',
        trackTitle: 'Amanecer',
        ownerName: 'Juan Pérez',
        requesterId: 'user-1',
        requesterName: 'Laura Restrepo',
        licenseType: 'sincronizacion',
        licensePrice: 2100000,
        currency: 'COP',
        licensePaymentStatus: 'pending',
        approvedAt: new Date('2026-09-05T00:00:00.000Z').toISOString(),
        createdAt: new Date('2026-08-20T00:00:00.000Z').toISOString(),
      });
    });
  });

  describe('countApprovedLicenses (privado)', () => {
    it('filtra únicamente por status=APROBADA, no por licensePaymentStatus', async () => {
      qb.getCount.mockResolvedValue(3);

      const range = { from: new Date('2026-09-01T00:00:00.000Z'), to: new Date('2026-10-01T00:00:00.000Z') };
      const count = await (service as any).countApprovedLicenses(['user-1'], range);

      expect(count).toBe(3);
      expect(qb.where).toHaveBeenCalledWith('rt.status = :aprobada', { aprobada: RequestsStatus.APROBADA });
      expect(qb.andWhere).not.toHaveBeenCalledWith(expect.stringContaining('license_payment_status'), expect.anything());
    });
  });

  describe('changePct (privado)', () => {
    it('retorna 0 cuando previous es 0, sin distinguir "sin dato previo" de "sin cambio"', () => {
      expect((service as any).changePct(5, 0)).toBe(0);
      expect((service as any).changePct(0, 0)).toBe(0);
    });

    it('calcula el % de cambio normal', () => {
      expect((service as any).changePct(15, 10)).toBe(50);
      expect((service as any).changePct(5, 10)).toBe(-50);
    });
  });

  describe('getMonthlyLicenseTrend (privado)', () => {
    it('rellena con count:0 los meses sin filas en el resultado crudo', async () => {
      const now = new Date();
      const currentLabel = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
      qb.getRawMany.mockResolvedValue([{ month: now.toISOString(), count: '7' }]);

      const points = await (service as any).getMonthlyLicenseTrend(['user-1'], 3);

      expect(points).toHaveLength(3);
      expect(points[points.length - 1]).toEqual({ month: currentLabel, count: 7 });
      expect(points[0].count).toBe(0);
      expect(points[1].count).toBe(0);
      // La serie es cronológica ascendente.
      expect(points.map((p: { month: string }) => p.month)).toEqual(
        [...points].map((p) => p.month).sort(),
      );
    });
  });
});
