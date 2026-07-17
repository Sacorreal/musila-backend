import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { PdfListContent } from '../interfaces/pdf-body-content.interface';

const styles = StyleSheet.create({
  list: {
    marginTop: 8,
  },
  item: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  marker: {
    width: 20,
    fontSize: 11,
  },
  text: {
    flex: 1,
    fontSize: 11,
    lineHeight: 1.4,
  },
});

interface PdfListBodyProps {
  content: PdfListContent;
}

export function PdfListBody({ content }: PdfListBodyProps) {
  const { items, ordered } = content;

  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <View key={index} style={styles.item} wrap={false}>
          <Text style={styles.marker}>{ordered ? `${index + 1}.` : '•'}</Text>
          <Text style={styles.text}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
