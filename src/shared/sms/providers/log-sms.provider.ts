import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider } from '../domain/sms-provider.interface';

/**
 * Implementación stub: no envía SMS reales, solo deja constancia en el log.
 * Sustituir por un proveedor real (p. ej. Twilio) cuando esté disponible,
 * registrándolo en `sms.module.ts` bajo el token `SMS_PROVIDER`.
 */
@Injectable()
export class LogSmsProvider implements SmsProvider {
  private readonly logger = new Logger(LogSmsProvider.name);

  async sendSms(to: string, message: string): Promise<void> {
    this.logger.warn(`[SMS stub] No hay proveedor de SMS configurado. Destinatario: ${to} — Mensaje: ${message}`);
  }
}
