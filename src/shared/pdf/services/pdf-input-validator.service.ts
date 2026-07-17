import { Injectable, Logger } from '@nestjs/common';
import { PdfBodyContentType } from '../enums/pdf-body-content-type.enum';
import {
  PdfBodyContent,
  PdfListContent,
  PdfTableContent,
  PdfTextContent,
} from '../interfaces/pdf-body-content.interface';
import { PdfGenerateInput } from '../interfaces/pdf-generate-input.interface';
import { PdfInvalidField, PdfValidationException } from '../exceptions/pdf-validation.exception';

@Injectable()
export class PdfInputValidatorService {
  private readonly logger = new Logger(PdfInputValidatorService.name);

  /**
   * Valida las variables de contenido de un PDF antes de que se ejecute
   * cualquier operación de generación.
   *
   * @throws {PdfValidationException} con el detalle de los campos inválidos
   */
  validate(input: PdfGenerateInput): void {
    const errors: PdfInvalidField[] = [];

    if (!input.documentTitle?.trim()) {
      errors.push({ field: 'documentTitle', reason: 'documentTitle es obligatorio' });
    }

    if (!input.body) {
      errors.push({ field: 'body', reason: 'body es obligatorio' });
    } else {
      errors.push(...this.validateBody(input.body));
    }

    if (errors.length > 0) {
      throw new PdfValidationException(errors);
    }

    this.logger.log(`Input de PDF validado: tipo=${input.body.type}, timestamp=${new Date().toISOString()}`);
  }

  private validateBody(body: PdfBodyContent): PdfInvalidField[] {
    switch (body.type) {
      case PdfBodyContentType.TABLE:
        return this.validateTable(body);
      case PdfBodyContentType.LIST:
        return this.validateList(body);
      case PdfBodyContentType.TEXT:
        return this.validateText(body);
      default:
        return [
          {
            field: 'body.type',
            reason: `Tipo de plantilla no soportado: ${String((body as PdfBodyContent).type)}`,
          },
        ];
    }
  }

  private validateTable(body: PdfTableContent): PdfInvalidField[] {
    const errors: PdfInvalidField[] = [];

    if (!body.columns?.length) {
      errors.push({ field: 'body.columns', reason: 'Debe definir al menos una columna' });
    } else {
      body.columns.forEach((col, i) => {
        if (!col.key || !col.header) {
          errors.push({ field: `body.columns[${i}]`, reason: 'Cada columna requiere key y header' });
        }
      });
    }

    if (!body.rows?.length) {
      errors.push({ field: 'body.rows', reason: 'El array de filas no puede estar vacío' });
    }

    return errors;
  }

  private validateList(body: PdfListContent): PdfInvalidField[] {
    if (!body.items?.length || body.items.some((item) => !item?.trim())) {
      return [{ field: 'body.items', reason: 'items no puede estar vacío ni contener elementos en blanco' }];
    }
    return [];
  }

  private validateText(body: PdfTextContent): PdfInvalidField[] {
    if (!body.paragraphs?.length || body.paragraphs.every((p) => !p?.trim())) {
      return [{ field: 'body.paragraphs', reason: 'Debe incluir al menos un párrafo no vacío' }];
    }
    return [];
  }
}
