/**
 * Builder manual de CSV (sin dependencia nueva — ver CLAUDE.md: no instalar
 * paquetes sin avisar antes). Suficiente para una tabla plana con límite de
 * filas acotado; si a futuro se necesita streaming o estructuras anidadas,
 * evaluar instalar `fast-csv@^5.0.2`.
 */
export interface CsvColumn<T> {
  key: keyof T;
  header: string;
}

function stringifyCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function escapeCsvValue(value: unknown): string {
  const stringValue = stringifyCsvValue(value);

  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

const UTF8_BOM = '﻿';

/** Antepone el BOM UTF-8 para que Excel abra tildes/ñ correctamente. */
export function buildCsv<T extends Record<string, any>>(
  columns: CsvColumn<T>[],
  rows: T[],
): string {
  const header = columns.map((column) => escapeCsvValue(column.header)).join(',');
  const body = rows
    .map((row) => columns.map((column) => escapeCsvValue(row[column.key])).join(','))
    .join('\r\n');

  return `${UTF8_BOM}${header}\r\n${body}`;
}
