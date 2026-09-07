/**
 * Construye el objeto de headers HTTP para servir un PDF ya generado
 * como descarga. No escribe al response — el controller decide cómo
 * transportar el buffer (ej. `StreamableFile`, igual que en recibos de
 * pago: `payments.controller.ts`).
 */
export function buildPdfHttpHeaders(filename: string, buffer: Buffer): Record<string, string | number> {
  return {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': buffer.length,
  };
}
