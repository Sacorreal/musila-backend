/**
 * Esquema del encabezado corporativo cargado desde
 * `config/pdf-branding.config.json`. Se inyecta automáticamente en cada
 * PDF generado por {@link PdfGeneratorService} — ningún consumidor lo
 * construye a mano.
 */
export interface PdfHeaderConfig {
  companyName: string;
  logoUrl: string;
  slogan: string;
  contactEmail: string;
  brandColor: string;
}
