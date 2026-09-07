export enum LegalProofStatus {
  /** El .ots ya se generó y guardó, aún sin confirmación en la blockchain de Bitcoin. */
  PENDING = 'pending',
  /** Reservado para el job futuro que confirme el .ots contra la blockchain (fuera de este alcance). */
  CONFIRMED = 'confirmed',
  /** OpenTimestamps falló tras agotar los reintentos; no se generó .ots. */
  FAILED = 'failed',
}
