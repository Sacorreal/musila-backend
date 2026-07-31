import { PdfBodyContent } from './pdf-body-content.interface';
import { PdfFooterConfig } from './pdf-footer-config.interface';

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
 *
 * `body` acepta un único bloque o un array de bloques renderizados en
 * secuencia (p. ej. varias tablas con su propio título), para documentos
 * de múltiples secciones. `footer` es opcional y se ancla al final de
 * cada página.
 */
export interface PdfGenerateInput {
  documentTitle: string;
  body: PdfBodyContent | PdfBodyContent[];
  footer?: PdfFooterConfig;
  metadata?: PdfDocumentMetadata;
}
