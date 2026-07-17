import React from 'react';
import { Document, Page } from '@react-pdf/renderer';
import { PdfBodyContentType } from '../enums/pdf-body-content-type.enum';
import { PdfBodyContent } from '../interfaces/pdf-body-content.interface';
import { PdfDocumentMetadata } from '../interfaces/pdf-generate-input.interface';
import { PdfHeaderConfig } from '../interfaces/pdf-header-config.interface';
import { CorporateHeader } from './pdf-header.template';
import { PdfTableBody } from './pdf-table.template';
import { PdfListBody } from './pdf-list.template';
import { PdfTextBody } from './pdf-text.template';
import { pdfPageStyles } from './pdf.styles';

interface PdfDocumentTemplateProps {
  headerConfig: PdfHeaderConfig;
  documentTitle: string;
  body: PdfBodyContent;
  metadata?: PdfDocumentMetadata;
}

function renderBody(body: PdfBodyContent) {
  switch (body.type) {
    case PdfBodyContentType.TABLE:
      return <PdfTableBody content={body} />;
    case PdfBodyContentType.LIST:
      return <PdfListBody content={body} />;
    case PdfBodyContentType.TEXT:
      return <PdfTextBody content={body} />;
  }
}

/**
 * Documento compuesto: encabezado corporativo (repetido en todas las
 * páginas) + cuerpo según el tipo de plantilla solicitado. Único punto
 * donde se ensamblan header y contenido.
 */
export function PdfDocumentTemplate({ headerConfig, documentTitle, body, metadata }: PdfDocumentTemplateProps) {
  return (
    <Document
      title={metadata?.title ?? documentTitle}
      author={metadata?.author ?? headerConfig.companyName}
      creationDate={metadata?.generatedAt ?? new Date()}
    >
      <Page size="A4" style={pdfPageStyles.page} wrap>
        <CorporateHeader config={headerConfig} documentTitle={documentTitle} />
        {renderBody(body)}
      </Page>
    </Document>
  );
}
