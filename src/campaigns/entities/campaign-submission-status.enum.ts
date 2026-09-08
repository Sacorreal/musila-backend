/** Estado de la postulación de un compositor a una campaña. */
export enum CampaignSubmissionStatus {
  /** Postulada, esperando revisión del sello. */
  PENDING = 'PENDING',
  /** El sello aprobó la postulación: se creó el `RequestedTrack` y sigue el flujo normal de licenciamiento. */
  SELECTED = 'SELECTED',
  /** El sello descartó la postulación. */
  DISCARDED = 'DISCARDED',
  /** El `RequestedTrack` asociado llegó a término (contrato cumplido). */
  LICENSED = 'LICENSED',
}
