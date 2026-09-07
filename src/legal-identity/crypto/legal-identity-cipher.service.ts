import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AesGcmCipher } from 'src/shared/crypto/aes-gcm-cipher.util';

/**
 * Cifrado en reposo (AES-256-GCM) de los datos de identidad legal (Ley 1581).
 * Usa una clave propia (`LEGAL_IDENTITY_ENCRYPTION_KEY`), distinta de
 * `MFA_ENCRYPTION_KEY`, para que el radio de exposición de un compromiso de
 * clave no cruce dominios (MFA vs. identidad legal).
 */
@Injectable()
export class LegalIdentityCipherService {
  private readonly cipher: AesGcmCipher;

  constructor(private readonly config: ConfigService) {
    const rawKey = this.config.get<string>('LEGAL_IDENTITY_ENCRYPTION_KEY');
    if (!rawKey) {
      throw new InternalServerErrorException(
        'LEGAL_IDENTITY_ENCRYPTION_KEY no está configurada: no es posible cifrar datos de identidad legal.',
      );
    }
    const key = Buffer.from(rawKey, 'hex');
    if (key.length !== AesGcmCipher.KEY_LENGTH) {
      throw new InternalServerErrorException(
        'LEGAL_IDENTITY_ENCRYPTION_KEY debe ser una clave de 32 bytes codificada en hex (64 caracteres).',
      );
    }
    this.cipher = new AesGcmCipher(key);
  }

  encrypt(plaintext: string): string {
    return this.cipher.encrypt(plaintext);
  }

  decrypt(serialized: string): string {
    try {
      return this.cipher.decrypt(serialized);
    } catch {
      throw new InternalServerErrorException('Dato de identidad legal cifrado con formato inválido.');
    }
  }
}
