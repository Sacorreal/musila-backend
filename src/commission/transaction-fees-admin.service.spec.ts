import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionFeesAdminService } from './transaction-fees-admin.service';
import { TransactionFeeConfigService } from './transaction-fee-config.service';
import { OrganizationType } from '../organizations/entities/organization-type.enum';

describe('TransactionFeesAdminService', () => {
  let service: TransactionFeesAdminService;
  let planRepo: { findOne: jest.Mock };
  let configService: jest.Mocked<Pick<
    TransactionFeeConfigService,
    'listCurrentByPlan' | 'getHistory' | 'setRate' | 'getTransactionFeeEntitlement'
  >>;

  const plan = { id: 'plan-uuid', key: 'SCOUT_PRO', name: 'Scout Pro' };
  const entitlement = {
    id: 'ent-uuid',
    key: 'marketplace.transaction_fee',
    appliesToOrganizationTypes: [OrganizationType.LABEL, OrganizationType.MANAGEMENT],
  };

  beforeEach(() => {
    planRepo = { findOne: jest.fn().mockResolvedValue(plan) };
    configService = {
      listCurrentByPlan: jest.fn().mockResolvedValue([]),
      getHistory: jest.fn().mockResolvedValue([]),
      setRate: jest.fn().mockResolvedValue({ before: null, after: {} }),
      getTransactionFeeEntitlement: jest.fn().mockResolvedValue(entitlement),
    } as any;

    service = new TransactionFeesAdminService(planRepo as any, configService as any);
  });

  it('rechaza PUBLISHER: la comisión solo aplica a LABEL/MANAGEMENT (§9)', async () => {
    await expect(
      service.update({ planId: 'plan-uuid', organizationType: OrganizationType.PUBLISHER, rate: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(configService.setRate).not.toHaveBeenCalled();
  });

  it('rechaza rate fuera de rango (§9.4/§9.5)', async () => {
    await expect(
      service.update({ planId: 'plan-uuid', organizationType: OrganizationType.LABEL, rate: 120 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('falla si el plan no existe (§9.6)', async () => {
    planRepo.findOne.mockResolvedValue(null);
    await expect(
      service.update({ planId: 'nope', organizationType: OrganizationType.LABEL, rate: 7 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('versiona la tarifa vía configService.setRate con el actor (§7/§20)', async () => {
    await service.update({
      planId: 'plan-uuid',
      organizationType: OrganizationType.LABEL,
      rate: 7,
      actorUserId: 'admin_123',
      actorName: 'Admin',
    });

    expect(configService.setRate).toHaveBeenCalledWith({
      planId: 'plan-uuid',
      organizationType: OrganizationType.LABEL,
      rate: 7,
      actorUserId: 'admin_123',
      actorName: 'Admin',
    });
  });

  it('getForPlan devuelve una fila por tipo aplicable aunque no exista config (§6)', async () => {
    const result = await service.getForPlan('plan-uuid');
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.organizationType)).toEqual([
      OrganizationType.LABEL,
      OrganizationType.MANAGEMENT,
    ]);
    expect(result.every((r) => r.rate === null)).toBe(true);
  });
});
