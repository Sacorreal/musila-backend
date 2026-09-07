/** Estado del registro de control de un evento de anticipo por usuario. */
export enum BankInformationRequestStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

/** Razón por la que un registro de control quedó completado. */
export enum BankInformationCompletionReason {
  /** El usuario completó el formulario tras ser notificado. */
  SUBMITTED = 'submitted',
  /** El usuario ya tenía información bancaria configurada de un evento anterior. */
  ALREADY_CONFIGURED = 'already_configured',
}
