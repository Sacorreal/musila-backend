/**
 * Estado del pago de la pauta a través de la pasarela configurada. Refleja el
 * estado normalizado del proveedor (Wompi) sin acoplarse a su API concreta.
 */
export enum PromotionPaymentStatus {
  /** Aún no se ha iniciado el checkout. */
  NONE = 'NONE',
  /** Checkout iniciado, esperando confirmación del webhook. */
  PENDING = 'PENDING',
  /** Pago confirmado por el webhook. */
  APPROVED = 'APPROVED',
  /** Pago declinado, expirado o con error. */
  DECLINED = 'DECLINED',
}
