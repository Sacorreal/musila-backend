import { PdfInputValidatorService } from './pdf-input-validator.service';
import { PdfValidationException } from '../exceptions/pdf-validation.exception';
import { PdfBodyContentType } from '../enums/pdf-body-content-type.enum';
import { PdfGenerateInput } from '../interfaces/pdf-generate-input.interface';

describe('PdfInputValidatorService', () => {
  let service: PdfInputValidatorService;

  beforeEach(() => {
    service = new PdfInputValidatorService();
  });

  function getInvalidFields(input: PdfGenerateInput): string[] {
    try {
      service.validate(input);
      return [];
    } catch (error) {
      return (error as PdfValidationException).invalidFields.map((f) => f.field);
    }
  }

  it('no lanza para un documentTitle y body de texto válidos', () => {
    expect(() =>
      service.validate({
        documentTitle: 'Contrato',
        body: { type: PdfBodyContentType.TEXT, paragraphs: ['Hola mundo'] },
      }),
    ).not.toThrow();
  });

  it('lanza PdfValidationException si documentTitle está vacío', () => {
    const fields = getInvalidFields({
      documentTitle: '   ',
      body: { type: PdfBodyContentType.TEXT, paragraphs: ['x'] },
    });
    expect(fields).toContain('documentTitle');
  });

  it('lanza si body es undefined', () => {
    const fields = getInvalidFields({ documentTitle: 'Doc', body: undefined as any });
    expect(fields).toContain('body');
  });

  describe('plantilla de tabla', () => {
    it('es válida con columnas y filas', () => {
      expect(() =>
        service.validate({
          documentTitle: 'Doc',
          body: {
            type: PdfBodyContentType.TABLE,
            columns: [{ key: 'name', header: 'Nombre' }],
            rows: [{ name: 'Juan' }],
          },
        }),
      ).not.toThrow();
    });

    it('falla si columns está vacío', () => {
      const fields = getInvalidFields({
        documentTitle: 'Doc',
        body: { type: PdfBodyContentType.TABLE, columns: [], rows: [{ a: 1 }] },
      });
      expect(fields).toContain('body.columns');
    });

    it('falla si rows está vacío', () => {
      const fields = getInvalidFields({
        documentTitle: 'Doc',
        body: { type: PdfBodyContentType.TABLE, columns: [{ key: 'a', header: 'A' }], rows: [] },
      });
      expect(fields).toContain('body.rows');
    });

    it('falla si una columna no tiene key o header', () => {
      const fields = getInvalidFields({
        documentTitle: 'Doc',
        body: {
          type: PdfBodyContentType.TABLE,
          columns: [{ key: '', header: 'A' } as any],
          rows: [{ a: 1 }],
        },
      });
      expect(fields).toContain('body.columns[0]');
    });
  });

  describe('plantilla de lista', () => {
    it('es válida con items no vacíos', () => {
      expect(() =>
        service.validate({
          documentTitle: 'Doc',
          body: { type: PdfBodyContentType.LIST, items: ['uno', 'dos'] },
        }),
      ).not.toThrow();
    });

    it('falla si items está vacío', () => {
      const fields = getInvalidFields({
        documentTitle: 'Doc',
        body: { type: PdfBodyContentType.LIST, items: [] },
      });
      expect(fields).toContain('body.items');
    });

    it('falla si algún item está en blanco', () => {
      const fields = getInvalidFields({
        documentTitle: 'Doc',
        body: { type: PdfBodyContentType.LIST, items: ['uno', '   '] },
      });
      expect(fields).toContain('body.items');
    });
  });

  describe('plantilla de texto', () => {
    it('falla si paragraphs está vacío', () => {
      const fields = getInvalidFields({
        documentTitle: 'Doc',
        body: { type: PdfBodyContentType.TEXT, paragraphs: [] },
      });
      expect(fields).toContain('body.paragraphs');
    });

    it('falla si todos los párrafos están en blanco', () => {
      const fields = getInvalidFields({
        documentTitle: 'Doc',
        body: { type: PdfBodyContentType.TEXT, paragraphs: ['  ', ''] },
      });
      expect(fields).toContain('body.paragraphs');
    });
  });

  it('falla con un tipo de plantilla no soportado', () => {
    const fields = getInvalidFields({
      documentTitle: 'Doc',
      body: { type: 'unknown' } as any,
    });
    expect(fields).toContain('body.type');
  });
});
