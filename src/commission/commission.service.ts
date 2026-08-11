import { Injectable } from '@nestjs/common';
import { RequestedTrack } from '../requested-tracks/entities/requested-track.entity';
import { EntitlementService } from '../entitlements/entitlement.service';
import { commissionCentsFor, fromCents, toCents } from './money.util';
import {
  CommissionRate,
  ResolveCommissionInput,
  ResolvedCommission,
} from './commission.types';

export interface CalculatedCommission {
  amount: number;
  buyerTotal: number;
}

/**
 * Orquesta la comisión transaccional del comprador (§10). Delega la resolución
 * de la tarifa vigente en `EntitlementService.getMarketplaceTransactionFee`
 * (§11), calcula el monto sin `float` (§12) y congela el snapshot en el Deal
 * (§13) para que sea inmutable frente a cambios posteriores de plan o tarifa.
 */
@Injectable()
export class CommissionService {
  constructor(private readonly entitlementService: EntitlementService) {}

  /** Resuelve tarifa vigente + calcula la comisión de una operación (§10/§17). */
  async resolveCommission(input: ResolveCommissionInput): Promise<ResolvedCommission> {
    const rate: CommissionRate = await this.entitlementService.getMarketplaceTransactionFee(
      input.organizationId,
    );

    const { amount, buyerTotal } = this.calculateCommission(input.dealAmount, rate.rate);

    return {
      ...rate,
      licenseAmount: input.dealAmount,
      amount,
      buyerTotal,
    };
  }

  /**
   * Cálculo puro (§12): commissionAmount = licenseAmount × rate / 100,
   * buyerTotal = licenseAmount + commissionAmount. Trabaja en centavos enteros.
   */
  calculateCommission(licenseAmount: number, ratePercent: number): CalculatedCommission {
    const baseCents = toCents(licenseAmount);
    const commissionCents = commissionCentsFor(baseCents, ratePercent);
    return {
      amount: fromCents(commissionCents),
      buyerTotal: fromCents(baseCents + commissionCents),
    };
  }

  /**
   * Congela el snapshot de comisión en el Deal (§13): estampa tarifa, monto,
   * moneda, plan, subscription y organización del comprador. Mutación pura: el
   * llamador persiste dentro de su propia transacción y emite el evento
   * `marketplace.commission.frozen` tras guardar.
   */
  freezeCommission(requestedTrack: RequestedTrack, resolved: ResolvedCommission): RequestedTrack {
    requestedTrack.buyerOrganizationId = resolved.organizationId;
    requestedTrack.buyerPlanId = resolved.planId;
    requestedTrack.buyerSubscriptionId = resolved.subscriptionId;
    requestedTrack.commissionRate = resolved.rate;
    requestedTrack.commissionAmount = resolved.amount;
    requestedTrack.commissionCurrency = resolved.currency;
    requestedTrack.commissionResolvedAt = new Date();
    return requestedTrack;
  }
}
