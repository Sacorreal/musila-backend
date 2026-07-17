import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { PdfTextContent } from '../interfaces/pdf-body-content.interface';

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 1.5,
    marginBottom: 10,
  },
});

interface PdfTextBodyProps {
  content: PdfTextContent;
}

export function PdfTextBody({ content }: PdfTextBodyProps) {
  return (
    <View style={styles.container}>
      {content.paragraphs.map((paragraph, index) => (
        <Text key={index} style={styles.paragraph}>
          {paragraph}
        </Text>
      ))}
    </View>
  );
}
