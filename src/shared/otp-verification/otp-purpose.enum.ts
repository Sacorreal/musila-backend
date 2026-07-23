/**
 * Acción de negocio que exige verificación OTP previa.
 * Extensible: agregar un nuevo valor y su resolución en OtpVerificationService
 * habilita el flujo para cualquier funcionalidad futura (aceptar coautoría, etc.).
 */
export enum OtpPurpose {
  REQUESTED_TRACK_APPROVAL = 'requested-track-approval',
  LICENSE_SIGNING = 'license-signing',
}
