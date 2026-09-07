export enum EntitlementType {
  BOOLEAN = 'BOOLEAN',
  QUOTA = 'QUOTA',
  LIMIT = 'LIMIT',
  STORAGE = 'STORAGE',
  FEATURE = 'FEATURE',
  COUNT = 'COUNT',
  /**
   * Valor porcentual (0-100) usado por entitlements comerciales como
   * `marketplace.transaction_fee`. El porcentaje concreto no vive en el plan
   * (PlanEntitlement) sino en su configuración versionada por tipo de
   * organización (ver TransactionFeeConfig).
   */
  PERCENTAGE = 'PERCENTAGE',
}
