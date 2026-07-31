/**
 * Footer opcional, anclado al final de cada página (`fixed`), pensado
 * para documentos legales que requieren sello visual + leyenda +
 * código de registro (p. ej. certificados). Ningún consumidor existente
 * lo usa hoy, por lo que es 100% opt-in.
 */
export interface PdfFooterConfig {
  sealImageUrl?: string;
  legalText: string;
  registryLabel: string;
  registryCode: string;
}
