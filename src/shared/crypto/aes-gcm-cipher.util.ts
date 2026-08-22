import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Cifrado simétrico autenticado (AES-256-GCM) puro, sin dependencias de Nest.
 * Formato serializado: `iv:authTag:ciphertext`, todo en base64. Cada dominio
 * que necesite cifrar secretos en reposo (MFA, identidad legal, etc.) envuelve
 * esta clase en su propio `@Injectable()` con su propia clave — así una
 * eventual rotación o compromiso de una clave no afecta a las demás.
 */
export class AesGcmCipher {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12; // recomendado para GCM
  static readonly KEY_LENGTH = 32; // AES-256

  constructor(private readonly key: Buffer) {
    if (key.length !== AesGcmCipher.KEY_LENGTH) {
      throw new Error(
        `La clave de cifrado debe tener ${AesGcmCipher.KEY_LENGTH} bytes (recibida: ${key.length}).`,
      );
    }
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(AesGcmCipher.IV_LENGTH);
    const cipher = createCipheriv(AesGcmCipher.ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
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
      throw new Error('Secreto cifrado con formato inválido.');
    }
    const decipher = createDecipheriv(
      AesGcmCipher.ALGORITHM,
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
