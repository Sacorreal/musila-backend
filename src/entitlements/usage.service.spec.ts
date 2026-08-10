import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EntitlementPeriod } from './entities/entitlement-period.enum';
import { SubjectType } from './entities/subject-type.enum';
import { Usage } from './entities/usage.entity';
import { UsageService } from './usage.service';

describe('UsageService', () => {
  let service: UsageService;
  let dataSource: { query: jest.Mock };
  let usageRepo: { findOne: jest.Mock; find: jest.Mock };

  const subject = { type: SubjectType.USER, id: 'user-1' };

  beforeEach(async () => {
    dataSource = { query: jest.fn() };
    usageRepo = { findOne: jest.fn(), find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(Usage), useValue: usageRepo },
      ],
    }).compile();

    service = module.get(UsageService);
  });

  it('consume dentro del límite: permitido y remaining correcto', async () => {
    dataSource.query.mockResolvedValue([{ consumed: 3 }]);

    const result = await service.consume({
      subject,
      entitlementKey: 'tracks.publish',
      periodKey: 'lifetime',
      limit: 5,
      unlimited: false,
    });

    expect(result).toEqual({ allowed: true, consumed: 3, remaining: 2 });
    // El límite viaja como parámetro del upsert condicional (chequeo atómico en Postgres).
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT'),
      expect.arrayContaining([5]),
    );
  });

  it('consume al alcanzar el límite: RETURNING vacío ⇒ LIMIT_EXCEEDED (allowed=false)', async () => {
    dataSource.query.mockResolvedValue([]);
    usageRepo.findOne.mockResolvedValue({ consumed: 5 });

    const result = await service.consume({
      subject,
      entitlementKey: 'tracks.publish',
      periodKey: 'lifetime',
      limit: 5,
      unlimited: false,
    });

    expect(result.allowed).toBe(false);
    expect(result.consumed).toBe(5);
    expect(result.remaining).toBe(0);
  });

  it('unlimited nunca bloquea y no aplica cláusula de límite', async () => {
    dataSource.query.mockResolvedValue([{ consumed: 1000 }]);

    const result = await service.consume({
      subject,
      entitlementKey: 'tracks.publish',
      periodKey: 'lifetime',
      limit: null,
      unlimited: true,
    });

    expect(result).toEqual({ allowed: true, consumed: 1000, remaining: null });
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.not.stringContaining('<='),
      expect.any(Array),
    );
  });

  it('rechaza sin tocar la BD un consumo inicial mayor que el límite', async () => {
    usageRepo.findOne.mockResolvedValue(null);

    const result = await service.consume({
      subject,
      entitlementKey: 'tracks.publish',
      periodKey: 'lifetime',
      amount: 10,
      limit: 5,
      unlimited: false,
    });

    expect(result.allowed).toBe(false);
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('refund decrementa sin bajar de cero (GREATEST en SQL)', async () => {
    dataSource.query.mockResolvedValue(undefined);

    await service.refund(subject, 'tracks.publish', 'lifetime', 1);

    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('GREATEST'),
      expect.any(Array),
    );
  });

  describe('buildPeriodKey', () => {
    const reference = new Date(Date.UTC(2026, 7, 10));

    it.each([
      [EntitlementPeriod.LIFETIME, 'lifetime'],
      [EntitlementPeriod.NONE, 'lifetime'],
      [EntitlementPeriod.MONTH, '2026-08'],
      [EntitlementPeriod.YEAR, '2026'],
      [EntitlementPeriod.DAY, '2026-08-10'],
    ])('%s → %s', (period, expected) => {
      expect(service.buildPeriodKey(period, reference)).toBe(expected);
    });

    it('BILLING_PERIOD incluye subscription y arranque del período', () => {
      const periodStart = new Date('2026-08-01T00:00:00.000Z');
      expect(
        service.buildPeriodKey(EntitlementPeriod.BILLING_PERIOD, reference, {
          subscriptionId: 'sub-1',
          periodStart,
        }),
      ).toBe(`sub:sub-1:${periodStart.toISOString()}`);
    });
  });
});
