import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto';

/**
 * Cifrado simétrico autenticado (AES-256-GCM) para secretos en reposo, como el
 * secreto TOTP (§7, §20). La clave viene de `MFA_ENCRYPTION_KEY` (32 bytes en
 * hex). El formato serializado es `iv:authTag:ciphertext`, todo en base64.
 *
 * Nunca se registra ni expone el secreto en claro.
 */
@Injectable()
export class SecretCipherService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12; // recomendado para GCM
  private static readonly KEY_LENGTH = 32; // AES-256

  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const rawKey = this.config.get<string>('MFA_ENCRYPTION_KEY');
    if (!rawKey) {
      throw new InternalServerErrorException(
        'MFA_ENCRYPTION_KEY no está configurada: no es posible cifrar secretos MFA.',
      );
    }
    const key = Buffer.from(rawKey, 'hex');
    if (key.length !== SecretCipherService.KEY_LENGTH) {
      throw new InternalServerErrorException(
        'MFA_ENCRYPTION_KEY debe ser una clave de 32 bytes codificada en hex (64 caracteres).',
      );
    }
    this.key = key;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(SecretCipherService.IV_LENGTH);
    const cipher = createCipheriv(SecretCipherService.ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  decrypt(serialized: string): string {
    const [ivB64, authTagB64, ciphertextB64] = serialized.split(':');
    if (!ivB64 || !authTagB64 || !ciphertextB64) {
      throw new InternalServerErrorException('Secreto cifrado con formato inválido.');
    }
    const decipher = createDecipheriv(
      SecretCipherService.ALGORITHM,
      this.key,
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, 'base64')),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  }
}
