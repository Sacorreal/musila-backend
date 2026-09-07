export enum CertificateStatus {
  /** Certificado creado, generación del PDF en curso o pendiente de reintento. */
  PENDING = 'pending',
  /** PDF generado y almacenado; disponible para descarga y envío. */
  ISSUED = 'issued',
  /** Se agotaron los reintentos de generación del PDF. */
  FAILED = 'failed',
}
