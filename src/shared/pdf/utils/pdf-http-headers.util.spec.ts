import { buildPdfHttpHeaders } from './pdf-http-headers.util';

describe('buildPdfHttpHeaders', () => {
  it('devuelve los headers HTTP correctos para servir un PDF como descarga', () => {
    const buffer = Buffer.from('contenido de prueba');

    const headers = buildPdfHttpHeaders('contrato.pdf', buffer);

    expect(headers['Content-Type']).toBe('application/pdf');
    expect(headers['Content-Disposition']).toBe('attachment; filename="contrato.pdf"');
    expect(headers['Content-Length']).toBe(buffer.length);
  });
});
