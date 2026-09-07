/**
 * Token de inyección de NestJS para el proveedor de SMS activo.
 * La lógica de negocio depende de este puerto, no de una implementación concreta.
 */
export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

/**
 * Puerto de la capa de dominio que abstrae el envío de SMS.
 *
 * Conectar un proveedor real (p. ej. Twilio) solo requiere implementar esta
 * interfaz y registrarla en `sms.module.ts` mediante el token `SMS_PROVIDER`.
 */
export interface SmsProvider {
  sendSms(to: string, message: string): Promise<void>;
}
