import { BadRequestException } from '@nestjs/common';

export interface PdfInvalidField {
  field: string;
  reason: string;
}

export class PdfValidationException extends BadRequestException {
  constructor(public readonly invalidFields: PdfInvalidField[]) {
    super({ message: 'El input de generación de PDF no es válido', invalidFields });
  }
}
