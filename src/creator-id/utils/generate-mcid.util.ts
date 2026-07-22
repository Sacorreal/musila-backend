import * as crypto from 'crypto';

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // sin caracteres ambiguos (0,O,1,I,L)
const CODE_LENGTH = 6;
const PREFIX = 'MC-';

/** Genera un Musila Creator ID (MCID) con formato MC-XXXXXX. */
export function generateMcid(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${PREFIX}${code}`;
}
