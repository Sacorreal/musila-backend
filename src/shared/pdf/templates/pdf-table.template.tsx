import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { PdfTableContent } from '../interfaces/pdf-body-content.interface';

const styles = StyleSheet.create({
  table: {
    marginTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerCell: {
    flex: 1,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowOdd: {
    backgroundColor: '#f9fafb',
  },
  cell: {
    flex: 1,
    fontSize: 10,
    color: '#111827',
  },
});

interface PdfTableBodyProps {
  content: PdfTableContent;
}

/**
 * Cuerpo tabular con encabezado de columnas fijo (se repite en cada
 * página que la tabla genere al desbordarse) y estilos alternados por
 * fila. La paginación es automática: cada fila lleva `wrap={false}`
 * para no partirse entre dos páginas.
 */
export function PdfTableBody({ content }: PdfTableBodyProps) {
  const { columns, rows } = content;

  return (
    <View style={styles.table}>
      <View style={styles.headerRow} fixed>
        {columns.map((col) => (
          <Text key={col.key} style={[styles.headerCell, { textAlign: col.align ?? 'left' }]}>
            {col.header}
          </Text>
        ))}
      </View>
      {rows.map((row, index) => (
        <View key={index} style={[styles.row, ...(index % 2 === 1 ? [styles.rowOdd] : [])]} wrap={false}>
          {columns.map((col) => (
            <Text key={col.key} style={[styles.cell, { textAlign: col.align ?? 'left' }]}>
              {String(row[col.key] ?? '')}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}
