'use strict';

/**
 * NestJS webpack configuration extendida.
 *
 * Puppeteer queda fuera del bundle (external) para evitar ERR_REQUIRE_ESM:
 * webpack intenta bundlear puppeteer como CommonJS, pero puppeteer v21+
 * incluye módulos nativos de Chromium que no pueden ser bundleados.
 * Al marcarlo external, Node lo resuelve desde node_modules en runtime.
 */
module.exports = (options, _webpack) => {
  const externals = Array.isArray(options.externals)
    ? [...options.externals, { puppeteer: 'commonjs puppeteer' }]
    : [options.externals, { puppeteer: 'commonjs puppeteer' }].filter(Boolean);

  return {
    ...options,
    externals,
  };
};
