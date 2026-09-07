import { BadRequestException } from '@nestjs/common';

/**
 * Extrae el challenge (base64url) del `clientDataJSON` que produce el
 * navegador durante una ceremonia WebAuthn. Permite localizar el challenge
 * server-side sin confiar en ningún dato de negocio enviado por el cliente
 * (§8, §20). Compartido por el registro/login de Passkeys y el step-up (DRY).
 */
export function extractChallengeFromClientData(clientDataJSON: string): string {
  try {
    const decoded = JSON.parse(
      Buffer.from(clientDataJSON, 'base64url').toString('utf8'),
    ) as { challenge?: string };
    return decoded.challenge ?? '';
  } catch {
    throw new BadRequestException('clientDataJSON inválido');
  }
}
