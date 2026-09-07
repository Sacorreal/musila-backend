/**
 * Máquina de estados explícita de una pauta (requerimiento §REQUIREMENTS):
 *
 *   borrador → solicitada(pendiente pago) → en_revisión → aprobada →
 *   programada → publicada/activa → finalizada
 *
 * con ramas: rechazada (con motivo), retirada y expirada.
 */
export enum PromotionStatus {
  /** Borrador sin confirmar (opcional). */
  DRAFT = 'DRAFT',
  /** Solicitada: se generó el enlace de pago y se espera confirmación del webhook. */
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  /** En revisión: pago confirmado, a la espera de decisión del administrador. */
  IN_REVIEW = 'IN_REVIEW',
  /** Aprobada por el administrador (aún sin publicar). */
  APPROVED = 'APPROVED',
  /** Programada: aprobada con fecha de inicio calculada, esperando cupo/fecha. */
  SCHEDULED = 'SCHEDULED',
  /** Publicada/activa: visible en los componentes de destacados. */
  ACTIVE = 'ACTIVE',
  /** Finalizada: cumplió su ciclo de publicación con normalidad. */
  FINISHED = 'FINISHED',
  /** Rechazada por el administrador (conserva `rejectionReason`). */
  REJECTED = 'REJECTED',
  /** Retirada por el publisher o el administrador antes de finalizar. */
  WITHDRAWN = 'WITHDRAWN',
  /** Expirada: venció el plazo de 15 días (excluida del público, no se borra). */
  EXPIRED = 'EXPIRED',
}

/** Estados "vivos": ocupan (o reservan) un recurso e impiden pautas duplicadas. */
export const LIVE_PROMOTION_STATUSES: readonly PromotionStatus[] = [
  PromotionStatus.PENDING_PAYMENT,
  PromotionStatus.IN_REVIEW,
  PromotionStatus.APPROVED,
  PromotionStatus.SCHEDULED,
  PromotionStatus.ACTIVE,
];

/** Estados terminales: no admiten transiciones posteriores. */
export const TERMINAL_PROMOTION_STATUSES: readonly PromotionStatus[] = [
  PromotionStatus.FINISHED,
  PromotionStatus.REJECTED,
  PromotionStatus.WITHDRAWN,
  PromotionStatus.EXPIRED,
];
