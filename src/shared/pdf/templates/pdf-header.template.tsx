import React from 'react';
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { PdfHeaderConfig } from '../interfaces/pdf-header-config.interface';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 20,
    borderBottomWidth: 2,
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 40,
    objectFit: 'contain',
  },
  slogan: {
    fontSize: 9,
    color: '#9ca3af',
    marginTop: 4,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
  },
  contact: {
    fontSize: 9,
    color: '#9ca3af',
    marginTop: 2,
  },
});

interface CorporateHeaderProps {
  config: PdfHeaderConfig;
  documentTitle: string;
}

/**
 * Encabezado corporativo (logo + datos de la empresa). Se renderiza con
 * `fixed` en la vista raíz para que `@react-pdf/renderer` lo repita
 * automáticamente en todas las páginas generadas por la paginación
 * automática del documento.
 */
export function CorporateHeader({ config, documentTitle }: CorporateHeaderProps) {
  return (
    <View style={[styles.header, { borderBottomColor: config.brandColor }]} fixed>
      <View>
        <Image src={config.logoUrl} style={styles.logo} />
        {config.slogan ? <Text style={styles.slogan}>{config.slogan}</Text> : null}
      </View>
      <View>
        <Text style={styles.title}>{documentTitle}</Text>
        <Text style={styles.contact}>{config.contactEmail}</Text>
      </View>
    </View>
  );
}
