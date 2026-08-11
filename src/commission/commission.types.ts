import { OrganizationType } from '../organizations/entities/organization-type.enum';

/** Tarifa vigente resuelta para una organización compradora (§11). */
export interface CommissionRate {
  rate: number;
  currency: string;
  planId: string;
  planKey: string;
  subscriptionId: string;
  organizationId: string;
  organizationType: OrganizationType;
  entitlementId: string;
}

/** Comisión calculada y lista para congelar en el Deal (§10). */
export interface ResolvedCommission extends CommissionRate {
  /** Valor de la licencia sobre el que se calculó (mismo unit que dealAmount). */
  licenseAmount: number;
  /** Monto de la comisión (licenseAmount * rate / 100). */
  amount: number;
  /** Total que paga el comprador (licenseAmount + amount). */
  buyerTotal: number;
}

export interface ResolveCommissionInput {
  organizationId: string;
  dealAmount: number;
}
