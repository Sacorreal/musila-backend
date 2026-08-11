import { OrganizationType } from '../organizations/entities/organization-type.enum';

/** Key del entitlement que modela la comisión transaccional del comprador (§2). */
export const MARKETPLACE_TRANSACTION_FEE_KEY = 'marketplace.transaction_fee';

/** Capability que habilita comprar en el marketplace (§2: "¿puede comprar?"). */
export const MARKETPLACE_PURCHASE_CAPABILITY = 'marketplace.purchase';

/** Capability interna requerida para administrar tarifas de plan (§8). */
export const PLATFORM_PLANS_MANAGE_CAPABILITY = 'platform.plans.manage';

/** Moneda única del modelo comercial actual (§12). */
export const COMMISSION_CURRENCY = 'COP';

/**
 * Tipos de organización a los que aplica la comisión B2B de este
 * requerimiento (§3). Fuente única de verdad, nunca hardcodear en llamadores.
 */
export const COMMISSION_APPLICABLE_ORGANIZATION_TYPES: readonly OrganizationType[] = [
  OrganizationType.LABEL,
  OrganizationType.MANAGEMENT,
];

/** Códigos de error de dominio expuestos al frontend (§3/§11). */
export enum CommissionErrorCode {
  BUYER_ORGANIZATION_TYPE_NOT_SUPPORTED = 'BUYER_ORGANIZATION_TYPE_NOT_SUPPORTED',
  TRANSACTION_FEE_NOT_CONFIGURED = 'TRANSACTION_FEE_NOT_CONFIGURED',
  BUYER_ORGANIZATION_NOT_FOUND = 'BUYER_ORGANIZATION_NOT_FOUND',
  BUYER_SUBSCRIPTION_NOT_FOUND = 'BUYER_SUBSCRIPTION_NOT_FOUND',
}

export function isCommissionApplicable(type: OrganizationType): boolean {
  return COMMISSION_APPLICABLE_ORGANIZATION_TYPES.includes(type);
}
