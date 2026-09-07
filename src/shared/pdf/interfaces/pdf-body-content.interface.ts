import { PdfBodyContentType } from '../enums/pdf-body-content-type.enum';

export interface PdfTableColumn {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
}

export interface PdfTableContent {
  type: PdfBodyContentType.TABLE;
  columns: PdfTableColumn[];
  rows: Record<string, string | number>[];
}

export interface PdfListContent {
  type: PdfBodyContentType.LIST;
  items: string[];
  ordered?: boolean;
}

export interface PdfTextContent {
  type: PdfBodyContentType.TEXT;
  paragraphs: string[];
}

/** Unión discriminada por `type` — es la única forma de contenido soportada. */
export type PdfBodyContent = PdfTableContent | PdfListContent | PdfTextContent;
