import { OtpPurpose } from './otp-purpose.enum';

/** Máximo de intentos fallidos antes de exigir un nuevo código. */
export const OTP_MAX_ATTEMPTS = 5;

/** Texto amigable de cada propósito, usado en el mensaje enviado al usuario. */
export const OTP_PURPOSE_LABELS: Record<OtpPurpose, string> = {
  [OtpPurpose.REQUESTED_TRACK_APPROVAL]: 'aprobar la solicitud de licencia',
  [OtpPurpose.LICENSE_SIGNING]: 'firmar y pagar la licencia',
  [OtpPurpose.SPLIT_SIGNING]: 'firmar el split de coautoría',
  [OtpPurpose.LICENSE_CONTRACT_SIGNING]: 'firmar el contrato de licencia de primer uso',
};
