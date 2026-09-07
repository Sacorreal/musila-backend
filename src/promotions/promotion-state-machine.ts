import { PromotionStatus } from './entities/promotion-status.enum';

/**
 * Transiciones válidas de la máquina de estados de una pauta. Fuente única de
 * verdad: cualquier cambio de estado debe validarse contra este mapa
 * (`PromotionsService.transition`). Los estados terminales no tienen destinos.
 */
export const PROMOTION_TRANSITIONS: Record<PromotionStatus, readonly PromotionStatus[]> = {
  [PromotionStatus.DRAFT]: [PromotionStatus.PENDING_PAYMENT, PromotionStatus.WITHDRAWN],
  [PromotionStatus.PENDING_PAYMENT]: [PromotionStatus.IN_REVIEW, PromotionStatus.WITHDRAWN],
  [PromotionStatus.IN_REVIEW]: [
    PromotionStatus.APPROVED,
    PromotionStatus.REJECTED,
    PromotionStatus.WITHDRAWN,
  ],
  [PromotionStatus.APPROVED]: [PromotionStatus.SCHEDULED, PromotionStatus.WITHDRAWN],
  [PromotionStatus.SCHEDULED]: [
    PromotionStatus.ACTIVE,
    PromotionStatus.WITHDRAWN,
    PromotionStatus.EXPIRED,
  ],
  [PromotionStatus.ACTIVE]: [
    PromotionStatus.FINISHED,
    PromotionStatus.EXPIRED,
    PromotionStatus.WITHDRAWN,
  ],
  [PromotionStatus.FINISHED]: [],
  [PromotionStatus.REJECTED]: [],
  [PromotionStatus.WITHDRAWN]: [],
  [PromotionStatus.EXPIRED]: [],
};

/** ¿Es válido pasar de `from` a `to`? */
export function canTransition(from: PromotionStatus, to: PromotionStatus): boolean {
  return PROMOTION_TRANSITIONS[from]?.includes(to) ?? false;
}
