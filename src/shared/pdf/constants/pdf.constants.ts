import { PdfHeaderConfig } from '../interfaces/pdf-header-config.interface';

export const PDF_CONFIG_PATH_SEGMENTS = ['src', 'shared', 'pdf', 'config', 'pdf-branding.config.json'] as const;

/** Valor placeholder en `pdf-branding.config.json` mientras no se suba el logo real. */
export const PDF_LOGO_PENDING_UPLOAD_SENTINEL = '__PENDING_LOGO_UPLOAD__';

/** URL pública del logo corporativo de Musila, usada como `logoUrl` en `pdf-branding.config.json`. */
export const MUSILA_LOGO_URL = 'https://musila.sfo3.cdn.digitaloceanspaces.com/musila-logo';

/** Campos que deben venir realmente del JSON de configuración — nunca se completan con defaults. */
export const PDF_HEADER_REQUIRED_FIELDS: (keyof PdfHeaderConfig)[] = [
  'companyName',
  'logoUrl',
  'contactEmail',
];

/** Usado íntegro si el JSON no parsea, y parcialmente para completar campos opcionales ausentes. */
export const PDF_DEFAULT_BRANDING: PdfHeaderConfig = {
  companyName: 'Musila',
  logoUrl: PDF_LOGO_PENDING_UPLOAD_SENTINEL,
  slogan: 'musila.co — ¡Dale vida a la música!',
  contactEmail: 'soporte@musila.co',
  brandColor: '#0e1ce2',
};
