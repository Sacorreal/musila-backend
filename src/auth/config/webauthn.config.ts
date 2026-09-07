import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Configuración WebAuthn / RP resuelta desde variables de entorno (§8). Debe
 * ser distinta por entorno (development / staging / production) y nunca
 * compartir credenciales entre entornos. El usuario final jamás introduce
 * RP ID, challenge ni credentialId: los controla el backend.
 */
@Injectable()
export class WebauthnConfig {
  constructor(private readonly config: ConfigService) {}

  /** Dominio del Relying Party (ej. "musila.co" o "localhost" en dev). */
  get rpID(): string {
    return this.config.get<string>('WEBAUTHN_RP_ID') || 'localhost';
  }

  /** Nombre visible del Relying Party. */
  get rpName(): string {
    return this.config.get<string>('WEBAUTHN_RP_NAME') || 'Musila';
  }

  /**
   * Orígenes permitidos (CSV). Se validan estrictamente en la verificación de
   * las ceremonias (§20). En dev suele ser `http://localhost:3000`.
   */
  get allowedOrigins(): string[] {
    const raw = this.config.get<string>('WEBAUTHN_ORIGINS');
    if (!raw) return ['http://localhost:3000'];
    return raw
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }
}
