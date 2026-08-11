import { ForbiddenException, UnprocessableEntityException, NotFoundException } from '@nestjs/common';
import { EntitlementService } from './entitlement.service';
import { OrganizationType } from '../organizations/entities/organization-type.enum';
import { CommissionErrorCode } from '../commission/commission.constants';

type Repo = { findOne: jest.Mock };

const repo = (): Repo => ({ findOne: jest.fn() });

describe('EntitlementService.getMarketplaceTransactionFee', () => {
  let service: EntitlementService;
  let subscriptionRepo: Repo;
  let entitlementRepo: Repo;
  let organizationRepo: Repo;
  let feeConfigRepo: Repo;
  let eventBus: { on: jest.Mock; emit: jest.Mock };

  const activeEntitlement = {
    id: 'ent-uuid',
    key: 'marketplace.transaction_fee',
    isActive: true,
    appliesToOrganizationTypes: [OrganizationType.LABEL, OrganizationType.MANAGEMENT],
  };

  beforeEach(() => {
    subscriptionRepo = repo();
    entitlementRepo = repo();
    organizationRepo = repo();
    feeConfigRepo = repo();
    eventBus = { on: jest.fn(), emit: jest.fn() };

    service = new EntitlementService(
      subscriptionRepo as any,
      repo() as any, // planEntitlementRepository (no usado aquí)
      entitlementRepo as any,
      organizationRepo as any,
      feeConfigRepo as any,
      {} as any, // usageService
      eventBus as any,
    );
  });

  it('lanza BUYER_ORGANIZATION_NOT_FOUND si la organización no existe', async () => {
    organizationRepo.findOne.mockResolvedValue(null);
    await expect(service.getMarketplaceTransactionFee('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lanza BUYER_ORGANIZATION_TYPE_NOT_SUPPORTED para PUBLISHER (§3/§23)', async () => {
    organizationRepo.findOne.mockResolvedValue({ id: 'org', type: OrganizationType.PUBLISHER });
    entitlementRepo.findOne.mockResolvedValue(activeEntitlement);

    await expect(service.getMarketplaceTransactionFee('org')).rejects.toMatchObject({
      response: { code: CommissionErrorCode.BUYER_ORGANIZATION_TYPE_NOT_SUPPORTED },
    });
    await expect(service.getMarketplaceTransactionFee('org')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lanza BUYER_SUBSCRIPTION_NOT_FOUND si no hay suscripción activa', async () => {
    organizationRepo.findOne.mockResolvedValue({ id: 'org', type: OrganizationType.LABEL });
    entitlementRepo.findOne.mockResolvedValue(activeEntitlement);
    subscriptionRepo.findOne.mockResolvedValue(null);

    await expect(service.getMarketplaceTransactionFee('org')).rejects.toMatchObject({
      response: { code: CommissionErrorCode.BUYER_SUBSCRIPTION_NOT_FOUND },
    });
  });

  it('lanza TRANSACTION_FEE_NOT_CONFIGURED si no hay tarifa vigente (nunca 0% silencioso, §11)', async () => {
    organizationRepo.findOne.mockResolvedValue({ id: 'org', type: OrganizationType.LABEL });
    entitlementRepo.findOne.mockResolvedValue(activeEntitlement);
    subscriptionRepo.findOne.mockResolvedValue({ id: 'sub_1', planId: 'plan', plan: { key: 'SCOUT_PRO' } });
    feeConfigRepo.findOne.mockResolvedValue(null);

    await expect(service.getMarketplaceTransactionFee('org')).rejects.toMatchObject({
      response: { code: CommissionErrorCode.TRANSACTION_FEE_NOT_CONFIGURED },
    });
    expect(service.getMarketplaceTransactionFee).toBeDefined();
    await expect(service.getMarketplaceTransactionFee('org')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('resuelve la tarifa vigente para LABEL con suscripción activa (§11)', async () => {
    organizationRepo.findOne.mockResolvedValue({ id: 'org', type: OrganizationType.LABEL });
    entitlementRepo.findOne.mockResolvedValue(activeEntitlement);
    subscriptionRepo.findOne.mockResolvedValue({ id: 'sub_1', planId: 'plan', plan: { key: 'SCOUT_PRO' } });
    feeConfigRepo.findOne.mockResolvedValue({ rate: '8.00', currency: 'COP' });

    const result = await service.getMarketplaceTransactionFee('org');

    expect(result).toEqual({
      rate: 8,
      currency: 'COP',
      planId: 'plan',
      planKey: 'SCOUT_PRO',
      subscriptionId: 'sub_1',
      organizationId: 'org',
      organizationType: OrganizationType.LABEL,
      entitlementId: 'ent-uuid',
    });
  });

  it('cachea la tarifa vigente (§25): una sola consulta al repo en llamadas repetidas', async () => {
    organizationRepo.findOne.mockResolvedValue({ id: 'org', type: OrganizationType.LABEL });
    entitlementRepo.findOne.mockResolvedValue(activeEntitlement);
    subscriptionRepo.findOne.mockResolvedValue({ id: 'sub_1', planId: 'plan', plan: { key: 'SCOUT_PRO' } });
    feeConfigRepo.findOne.mockResolvedValue({ rate: '8.00', currency: 'COP' });

    await service.getMarketplaceTransactionFee('org');
    await service.getMarketplaceTransactionFee('org');

    expect(feeConfigRepo.findOne).toHaveBeenCalledTimes(1);
  });

  it('registra el listener de invalidación de cache en onModuleInit (§25)', () => {
    service.onModuleInit();
    expect(eventBus.on).toHaveBeenCalledWith(
      'marketplace.transaction_fee.updated',
      expect.any(Function),
    );
  });
});
