import * as crypto from 'crypto';

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // sin caracteres ambiguos (0,O,1,I,L)
const CODE_LENGTH = 6;
const PREFIX = 'MC-';

/**
 * Genera un Musila Creator ID (MCID) con formato MC-XXXXXX.
 *
 * @deprecated Solo se conserva para que la migración histórica
 * `1784800000000-AddMusilaCreatorIdToUsers` siga compilando y siendo
 * ejecutable en instalaciones nuevas. El identificador de usuario actual es
 * el username (ver `src/username/`), generado por
 * `generateTempUsername` para el backfill de la migración
 * `1791000000000-ReplaceMusilaCreatorIdWithUsername`.
 */
export function generateMcid(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${PREFIX}${code}`;
}
