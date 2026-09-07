/**
 * Estados de pago del anticipo, literales del documento de negocio:
 * PENDIENTE (anticipo > 0, aún no pagado), PAGADA (todas las cuotas pagadas),
 * EN_MORA (alguna cuota venció sin pagarse), APROBADA (anticipo == 0, no hay cobro).
 */
export enum LicenseContractPaymentStatus {
  PENDIENTE = 'pendiente',
  PAGADA = 'pagada',
  EN_MORA = 'en_mora',
  APROBADA = 'aprobada',
}
