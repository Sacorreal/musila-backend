import React from 'react';
import { Document, Page } from '@react-pdf/renderer';
import { PdfBodyContentType } from '../enums/pdf-body-content-type.enum';
import { PdfBodyContent } from '../interfaces/pdf-body-content.interface';
import { PdfDocumentMetadata } from '../interfaces/pdf-generate-input.interface';
import { PdfFooterConfig } from '../interfaces/pdf-footer-config.interface';
import { PdfHeaderConfig } from '../interfaces/pdf-header-config.interface';
import { CorporateHeader } from './pdf-header.template';
import { PdfTableBody } from './pdf-table.template';
import { PdfListBody } from './pdf-list.template';
import { PdfTextBody } from './pdf-text.template';
import { PdfFooterTemplate } from './pdf-footer.template';
import { pdfPageStyles } from './pdf.styles';

interface PdfDocumentTemplateProps {
  headerConfig: PdfHeaderConfig;
  documentTitle: string;
  body: PdfBodyContent | PdfBodyContent[];
  footer?: PdfFooterConfig;
  metadata?: PdfDocumentMetadata;
}

function renderBlock(block: PdfBodyContent, key: number) {
  switch (block.type) {
    case PdfBodyContentType.TABLE:
      return <PdfTableBody key={key} content={block} />;
    case PdfBodyContentType.LIST:
      return <PdfListBody key={key} content={block} />;
    case PdfBodyContentType.TEXT:
      return <PdfTextBody key={key} content={block} />;
  }
}

function renderBody(body: PdfBodyContent | PdfBodyContent[]) {
  const blocks = Array.isArray(body) ? body : [body];
  return blocks.map((block, index) => renderBlock(block, index));
}

/**
 * Documento compuesto: encabezado corporativo (repetido en todas las
 * páginas) + cuerpo (uno o varios bloques, en secuencia) + footer
 * opcional. Único punto donde se ensamblan header, contenido y footer.
 */
export function PdfDocumentTemplate({ headerConfig, documentTitle, body, footer, metadata }: PdfDocumentTemplateProps) {
  return (
    <Document
      title={metadata?.title ?? documentTitle}
      author={metadata?.author ?? headerConfig.companyName}
      creationDate={metadata?.generatedAt ?? new Date()}
    >
      <Page size="A4" style={pdfPageStyles.page} wrap>
        <CorporateHeader config={headerConfig} documentTitle={documentTitle} />
        {renderBody(body)}
        {footer ? <PdfFooterTemplate config={footer} /> : null}
      </Page>
    </Document>
  );
}
