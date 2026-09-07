import { canTransition, PROMOTION_TRANSITIONS } from './promotion-state-machine';
import {
  PromotionStatus,
  TERMINAL_PROMOTION_STATUSES,
} from './entities/promotion-status.enum';

describe('promotion-state-machine', () => {
  it('permite el camino feliz completo', () => {
    expect(canTransition(PromotionStatus.PENDING_PAYMENT, PromotionStatus.IN_REVIEW)).toBe(true);
    expect(canTransition(PromotionStatus.IN_REVIEW, PromotionStatus.APPROVED)).toBe(true);
    expect(canTransition(PromotionStatus.APPROVED, PromotionStatus.SCHEDULED)).toBe(true);
    expect(canTransition(PromotionStatus.SCHEDULED, PromotionStatus.ACTIVE)).toBe(true);
    expect(canTransition(PromotionStatus.ACTIVE, PromotionStatus.EXPIRED)).toBe(true);
  });

  it('permite el rechazo desde revisión', () => {
    expect(canTransition(PromotionStatus.IN_REVIEW, PromotionStatus.REJECTED)).toBe(true);
  });

  it('rechaza transiciones inválidas', () => {
    expect(canTransition(PromotionStatus.PENDING_PAYMENT, PromotionStatus.ACTIVE)).toBe(false);
    expect(canTransition(PromotionStatus.IN_REVIEW, PromotionStatus.ACTIVE)).toBe(false);
    expect(canTransition(PromotionStatus.DRAFT, PromotionStatus.APPROVED)).toBe(false);
  });

  it('los estados terminales no tienen transiciones', () => {
    for (const status of TERMINAL_PROMOTION_STATUSES) {
      expect(PROMOTION_TRANSITIONS[status]).toHaveLength(0);
    }
  });

  it('cualquier estado vivo puede retirarse', () => {
    for (const status of [
      PromotionStatus.PENDING_PAYMENT,
      PromotionStatus.IN_REVIEW,
      PromotionStatus.APPROVED,
      PromotionStatus.SCHEDULED,
      PromotionStatus.ACTIVE,
    ]) {
      expect(canTransition(status, PromotionStatus.WITHDRAWN)).toBe(true);
    }
  });
});
