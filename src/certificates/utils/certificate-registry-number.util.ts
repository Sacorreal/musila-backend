import { randomBytes } from 'crypto';

const RANDOM_SUFFIX_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomSuffix(length: number): string {
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += RANDOM_SUFFIX_CHARS[bytes[i] % RANDOM_SUFFIX_CHARS.length];
  }
  return result;
}

/**
 * Genera un ID de registro de certificado legible, no secuencial:
 * `MSL-CA-{timestamp en base36}-{4 caracteres aleatorios}`. No depende de
 * un contador en BD (sin condiciones de carrera) ni revela el volumen de
 * certificados emitidos.
 */
export function generateCertificateRegistryNumber(now: Date = new Date()): string {
  const timestampPart = now.getTime().toString(36).toUpperCase();
  return `MSL-CA-${timestampPart}-${randomSuffix(4)}`;
}
