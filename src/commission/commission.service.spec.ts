import { CommissionService } from './commission.service';
import { EntitlementService } from '../entitlements/entitlement.service';
import { RequestedTrack } from '../requested-tracks/entities/requested-track.entity';
import { OrganizationType } from '../organizations/entities/organization-type.enum';
import type { CommissionRate } from './commission.types';

describe('CommissionService', () => {
  let service: CommissionService;
  let entitlementService: { getMarketplaceTransactionFee: jest.Mock };

  const baseRate = (rate: number): CommissionRate => ({
    rate,
    currency: 'COP',
    planId: 'plan-uuid',
    planKey: 'SCOUT_PRO',
    subscriptionId: 'sub_123',
    organizationId: 'org-uuid',
    organizationType: OrganizationType.LABEL,
    entitlementId: 'ent-uuid',
  });

  beforeEach(() => {
    entitlementService = { getMarketplaceTransactionFee: jest.fn() };
    service = new CommissionService(entitlementService as unknown as EntitlementService);
  });

  describe('calculateCommission', () => {
    it('calcula 8% de $3.000.000 = $240.000 y total $3.240.000 (§26)', () => {
      const result = service.calculateCommission(3_000_000, 8);
      expect(result.amount).toBe(240_000);
      expect(result.buyerTotal).toBe(3_240_000);
    });

    it('mantiene precisión con 7,50%: $3.000.000 × 7.50% = $225.000 (§26)', () => {
      const result = service.calculateCommission(3_000_000, 7.5);
      expect(result.amount).toBe(225_000);
      expect(result.buyerTotal).toBe(3_225_000);
    });

    it('no usa float: 0% deja comisión en 0 y total = base', () => {
      const result = service.calculateCommission(1_234_567.89, 0);
      expect(result.amount).toBe(0);
      expect(result.buyerTotal).toBe(1_234_567.89);
    });
  });

  describe('resolveCommission', () => {
    it('resuelve tarifa vigente y arma el resultado completo', async () => {
      entitlementService.getMarketplaceTransactionFee.mockResolvedValue(baseRate(8));

      const result = await service.resolveCommission({
        organizationId: 'org-uuid',
        dealAmount: 3_000_000,
      });

      expect(entitlementService.getMarketplaceTransactionFee).toHaveBeenCalledWith('org-uuid');
      expect(result).toMatchObject({
        rate: 8,
        amount: 240_000,
        buyerTotal: 3_240_000,
        licenseAmount: 3_000_000,
        currency: 'COP',
        planId: 'plan-uuid',
        subscriptionId: 'sub_123',
      });
    });

    it('propaga el error de dominio si no hay tarifa configurada', async () => {
      entitlementService.getMarketplaceTransactionFee.mockRejectedValue(
        new Error('TRANSACTION_FEE_NOT_CONFIGURED'),
      );
      await expect(
        service.resolveCommission({ organizationId: 'org-uuid', dealAmount: 100 }),
      ).rejects.toThrow('TRANSACTION_FEE_NOT_CONFIGURED');
    });
  });

  describe('freezeCommission', () => {
    it('estampa el snapshot inmutable en el Deal (§13)', () => {
      const track = new RequestedTrack();
      const resolved = {
        ...baseRate(8),
        licenseAmount: 3_000_000,
        amount: 240_000,
        buyerTotal: 3_240_000,
      };

      service.freezeCommission(track, resolved);

      expect(track.buyerOrganizationId).toBe('org-uuid');
      expect(track.buyerPlanId).toBe('plan-uuid');
      expect(track.buyerSubscriptionId).toBe('sub_123');
      expect(track.commissionRate).toBe(8);
      expect(track.commissionAmount).toBe(240_000);
      expect(track.commissionCurrency).toBe('COP');
      expect(track.commissionResolvedAt).toBeInstanceOf(Date);
    });
  });
});
