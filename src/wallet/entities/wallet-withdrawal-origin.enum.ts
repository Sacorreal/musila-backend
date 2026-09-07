/** Cómo se originó la solicitud de retiro: ya no existe el disparo manual del usuario. */
export enum WalletWithdrawalOrigin {
  /** Legado: solicitudes creadas antes de que el pago semanal se automatizara. */
  MANUAL = 'manual',
  /** Generada por el cron de pago automático de los lunes. */
  SCHEDULED = 'scheduled',
}
