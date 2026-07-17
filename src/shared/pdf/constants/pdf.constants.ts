import { PdfHeaderConfig } from '../interfaces/pdf-header-config.interface';

export const PDF_CONFIG_PATH_SEGMENTS = ['src', 'shared', 'pdf', 'config', 'pdf-branding.config.json'] as const;


/** Campos que deben venir realmente del JSON de configuración — nunca se completan con defaults. */
export const PDF_HEADER_REQUIRED_FIELDS: (keyof PdfHeaderConfig)[] = [
  'companyName',
  'logoUrl',
  'contactEmail',
];

/** Usado íntegro si el JSON no parsea, y parcialmente para completar campos opcionales ausentes. */
export const PDF_DEFAULT_BRANDING: PdfHeaderConfig = {
  companyName: 'Musila',
  logoUrl: 'https://musila.sfo3.cdn.digitaloceanspaces.com/musila-logo',
  slogan: 'musila.co — ¡Dale vida a la música!',
  contactEmail: 'soporte@musila.co',
  brandColor: '#0e1ce2',
};
