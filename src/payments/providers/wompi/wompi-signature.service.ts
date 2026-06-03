import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { IntegritySignatureInput, ProviderEvent } from '../../domain/payment-provider.types';

/**
 * Encapsula la criptografía de Wompi:
 *  - Firma de integridad del Widget/Checkout.
 *  - Verificación del checksum de los eventos (webhooks).
 *
 * Se aísla aquí para permitir pruebas unitarias deterministas con los vectores
 * de ejemplo de la documentación de Wompi.
 */
@Injectable()
export class WompiSignatureService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Firma de integridad = SHA256(reference + amountInCents + currency [+ expirationTime] + integritySecret)
   * Referencia: https://docs.wompi.co/docs/colombia/widget-checkout-web/
   */
  generateIntegritySignature(input: IntegritySignatureInput): string {
    const secret = this.configService.get<string>('WOMPI_INTEGRITY_SECRET', '');
    if (!secret) {
      throw new Error('WOMPI_INTEGRITY_SECRET no está configurado');
    }

    const parts = [
      input.reference,
      String(input.amountInCents),
      input.currency,
    ];
    if (input.expirationTime) parts.push(input.expirationTime);
    parts.push(secret);

    return crypto.createHash('sha256').update(parts.join('')).digest('hex');
  }

  /**
   * Verifica el checksum de un evento de Wompi.
   *
   * checksum = SHA256(concat(valores de signature.properties en orden) + timestamp + eventsSecret)
   * Referencia: https://docs.wompi.co/docs/colombia/eventos/
   *
   * La comparación es en tiempo constante para evitar timing attacks.
   */
  verifyEventSignature(event: ProviderEvent): boolean {
    const secret = this.configService.get<string>('WOMPI_EVENTS_SECRET', '');
    if (!secret) {
      throw new Error('WOMPI_EVENTS_SECRET no está configurado');
    }

    const properties = event?.signature?.properties;
    const checksum = event?.signature?.checksum;
    if (!Array.isArray(properties) || !checksum || event.timestamp == null) {
      return false;
    }

    const concatenated = properties
      .map((path) => this.resolvePath(event.data, path))
      .join('');

    const computed = crypto
      .createHash('sha256')
      .update(`${concatenated}${event.timestamp}${secret}`)
      .digest('hex')
      .toUpperCase();

    return this.timingSafeEqual(computed, String(checksum).toUpperCase());
  }

  /**
   * Resuelve una ruta tipo `transaction.id` o `transaction.status` dentro del
   * objeto `data` del evento. Wompi declara las propiedades con prefijo del
   * recurso raíz (p. ej. `transaction.status`).
   */
  private resolvePath(data: Record<string, any>, path: string): string {
    const segments = path.split('.');
    // El primer segmento (p. ej. "transaction") suele ser la clave raíz en data.
    let current: any = data;
    for (const segment of segments) {
      if (current == null) return '';
      current = current[segment];
    }
    return current == null ? '' : String(current);
  }

  private timingSafeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }
}
