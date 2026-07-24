'use strict';

const { createHmac } = require('crypto');

/**
 * Worker de piscina — se ejecuta en su propio hilo, fuera del grafo de DI de Nest.
 * Es JS plano (no TS) a propósito: piscina carga el archivo del worker vía `import()`
 * dinámico real, sin pasar por `require`/ts-node, así que un `.ts` no se transpila ahí.
 * Firma el payload del enlace de pago (HMAC-SHA256) para producir un token único,
 * verificable y con expiración — la parte CPU-bound del envío en lote de cobros.
 */
module.exports = function signPaymentLinkToken({ collectionId, requestedTrackId, secret, expiresAt }) {
  const payload = JSON.stringify({ collectionId, requestedTrackId, exp: expiresAt });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const signature = createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
};
