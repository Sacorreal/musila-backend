import { PromotionType } from './entities/promotion-type.enum';

/** Moneda única del modelo comercial actual (igual que el resto del backend). */
export const PROMOTION_CURRENCY = 'COP';

/** Duración de la publicación de una pauta, en días (requerimiento §FEATURES 5). */
export const PROMOTION_DURATION_DAYS = 15;

/**
 * Capacidad de display = cupo global de pautas activas simultáneas por tipo
 * (requerimiento §FEATURES 6/7 y §USER FLOWS 1.3). Al llenarse, las nuevas
 * pautas se programan para cuando expire la más antigua de su tipo.
 */
export const PROMOTION_SLOTS: Record<PromotionType, number> = {
  [PromotionType.TRACK]: 10,
  [PromotionType.COMPOSER]: 5,
};

/** Capability B2B que habilita gestionar pautas (solo organizaciones publisher). */
export const PROMOTION_MANAGE_CAPABILITY = 'promotion.manage';

/** Permiso de staff para gestionar (aprobar/rechazar) solicitudes de pauta. */
export const PROMOTIONS_MANAGE_PERMISSION = 'promotions.manage';

/** Permiso de staff (superadmin) para gestionar los precios de las pautas. */
export const PROMOTIONS_PRICING_MANAGE_PERMISSION = 'promotions.pricing.manage';

/** Umbral de SLA (horas) para escalar al admin una solicitud en revisión. */
export const PROMOTION_REVIEW_SLA_HOURS = 24;

/** Códigos de error de dominio expuestos al frontend. */
export enum PromotionErrorCode {
  ORGANIZATION_NOT_PUBLISHER = 'ORGANIZATION_NOT_PUBLISHER',
  RESOURCE_NOT_IN_ROSTER = 'RESOURCE_NOT_IN_ROSTER',
  DUPLICATE_ACTIVE_PROMOTION = 'DUPLICATE_ACTIVE_PROMOTION',
  PRICING_NOT_CONFIGURED = 'PRICING_NOT_CONFIGURED',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
}
