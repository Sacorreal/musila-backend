export enum CertificateRecipientStatus {
  /** Aún no se ha intentado enviar el certificado a este destinatario. */
  PENDING = 'pending',
  /** El correo con el PDF adjunto se envió exitosamente. */
  SENT = 'sent',
  /** Se agotaron los reintentos de envío del correo. */
  FAILED = 'failed',
  /** Se omitió el envío porque el autor no tiene datos de identificación completos (Flow 4). */
  SKIPPED_INCOMPLETE_DATA = 'skipped_incomplete_data',
}
