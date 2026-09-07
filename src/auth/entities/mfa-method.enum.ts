/** Método con el que el usuario superó un desafío de autenticación fuerte. */
export enum MfaMethod {
  PASSKEY = 'PASSKEY',
  TOTP = 'TOTP',
  RECOVERY_CODE = 'RECOVERY_CODE',
}
