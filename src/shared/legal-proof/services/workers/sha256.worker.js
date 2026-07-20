'use strict';

const { createHash } = require('crypto');

/**
 * Worker de piscina — se ejecuta en su propio hilo, fuera del grafo de DI de Nest.
 * Es JS plano (no TS) a propósito: piscina carga el archivo del worker vía `import()`
 * dinámico real, sin pasar por `require`/ts-node, así que un `.ts` no se transpila ahí.
 * Al ser JS válido desde ya, funciona igual en `src/` (dev/test) que copiado a `dist/`
 * (build de producción, ver `nest-cli.json` → compilerOptions.assets).
 */
module.exports = function computeSha256(data) {
  return createHash('sha256').update(data).digest('hex');
};
