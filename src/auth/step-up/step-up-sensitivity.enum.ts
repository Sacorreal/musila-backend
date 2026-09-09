/**
 * Nivel de sensibilidad de un scope de step-up (§15). Determina qué métodos de
 * autenticación fuerte se aceptan y si el grant emitido es de un solo uso.
 */
export enum StepUpSensitivity {
  STANDARD = 'STANDARD',
  CRITICAL = 'CRITICAL',
}
