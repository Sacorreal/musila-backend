import React from 'react';
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { PdfFooterConfig } from '../interfaces/pdf-footer-config.interface';

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  seal: {
    width: 48,
    height: 48,
    objectFit: 'contain',
    marginRight: 12,
  },
  textColumn: {
    flex: 1,
  },
  legalText: {
    fontSize: 8,
    color: '#6b7280',
    lineHeight: 1.4,
  },
  registryText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    marginTop: 4,
  },
});

interface PdfFooterTemplateProps {
  config: PdfFooterConfig;
}

/**
 * Footer institucional (sello + leyenda legal + código de registro),
 * anclado al final de cada página vía `fixed` — mismo mecanismo que
 * {@link CorporateHeader} pero posicionado abajo con `position: absolute`.
 */
export function PdfFooterTemplate({ config }: PdfFooterTemplateProps) {
  return (
    <View style={styles.footer} fixed>
      {config.sealImageUrl ? <Image src={config.sealImageUrl} style={styles.seal} /> : null}
      <View style={styles.textColumn}>
        <Text style={styles.legalText}>{config.legalText}</Text>
        <Text style={styles.registryText}>
          {config.registryLabel}: {config.registryCode}
        </Text>
      </View>
    </View>
  );
}
