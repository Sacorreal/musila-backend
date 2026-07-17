import { PdfBodyContent } from './pdf-body-content.interface';

export interface PdfDocumentMetadata {
  title?: string;
  author?: string;
  generatedAt?: Date;
}

/**
 * Único punto de entrada de datos para generar un PDF con la utilidad
 * global. El desarrollador solo provee estas variables de contenido — el
 * encabezado corporativo se inyecta automáticamente y no forma parte de
 * este contrato.
 */
export interface PdfGenerateInput {
  documentTitle: string;
  body: PdfBodyContent;
  metadata?: PdfDocumentMetadata;
}
