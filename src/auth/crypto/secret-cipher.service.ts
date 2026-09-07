import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AesGcmCipher } from 'src/shared/crypto/aes-gcm-cipher.util';

/**
 * Cifrado simétrico autenticado (AES-256-GCM) para secretos en reposo, como el
 * secreto TOTP (§7, §20). La clave viene de `MFA_ENCRYPTION_KEY` (32 bytes en
 * hex). El formato serializado es `iv:authTag:ciphertext`, todo en base64.
 *
 * Nunca se registra ni expone el secreto en claro.
 */
@Injectable()
export class SecretCipherService {
  private readonly cipher: AesGcmCipher;

  constructor(private readonly config: ConfigService) {
    const rawKey = this.config.get<string>('MFA_ENCRYPTION_KEY');
    if (!rawKey) {
      throw new InternalServerErrorException(
        'MFA_ENCRYPTION_KEY no está configurada: no es posible cifrar secretos MFA.',
      );
    }
    const key = Buffer.from(rawKey, 'hex');
    if (key.length !== AesGcmCipher.KEY_LENGTH) {
      throw new InternalServerErrorException(
        'MFA_ENCRYPTION_KEY debe ser una clave de 32 bytes codificada en hex (64 caracteres).',
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
      throw new InternalServerErrorException('Secreto cifrado con formato inválido.');
    }
  }
}
