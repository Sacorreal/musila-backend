export const CERTIFICATE_TIMEOUTS = {
  /** Deja margen dentro del SLA de 60s del requerimiento (generación + envío corren en listeners separados). */
  GENERATION_TOTAL_MS: 50_000,
} as const;

/** 3 intentos totales (1 inicial + 2 reintentos), backoff simple. */
export const CERTIFICATE_GENERATION_RETRY = {
  MAX_RETRIES: 2,
  BASE_DELAY_MS: 1_000,
  MAX_DELAY_MS: 5_000,
} as const;

/** 3 intentos totales con backoff exponencial, según Flow 2 del requerimiento. */
export const CERTIFICATE_EMAIL_RETRY = {
  MAX_RETRIES: 2,
  BASE_DELAY_MS: 2_000,
  MAX_DELAY_MS: 8_000,
} as const;

/**
 * TODO(negocio): reemplazar por el texto legal definitivo aprobado por el
 * equipo legal. Placeholder razonable mientras tanto — no bloquea la
 * implementación funcional del certificado.
 */
export const CERTIFICATE_LEGAL_TEXT =
  'Este Certificado de Autoría constituye una constancia interna de publicación en la plataforma Musila, ' +
  'emitida automáticamente en la fecha de publicación de la obra. No sustituye el registro ante la autoridad ' +
  'nacional de derecho de autor correspondiente ni constituye un dictamen legal.';

export const CERTIFICATE_REGISTRY_LABEL = 'ID de registro del certificado';

export const CERTIFICATE_TECH_SUPPORT_EMAIL_ENV = 'TECH_SUPPORT_EMAIL';
export const CERTIFICATE_TECH_SUPPORT_EMAIL_DEFAULT = 'soporte@musila.co';
