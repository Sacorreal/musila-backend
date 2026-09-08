/** Motivo de cierre de una campaña (§CREACIÓN DE CAMPAÑAS: se elimina de la vista, nunca se borra). */
export enum CampaignClosedReason {
  /** Se cumplió la fecha máxima de recepción (cron `CampaignSchedulerService`). */
  DEADLINE = 'DEADLINE',
  /** Se alcanzó la cantidad de canciones requeridas (cierre síncrono al seleccionar). */
  QUOTA = 'QUOTA',
  /** El sello la cerró manualmente antes de tiempo. */
  MANUAL = 'MANUAL',
}
