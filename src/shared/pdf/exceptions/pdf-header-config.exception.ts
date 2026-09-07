import { UnprocessableEntityException } from '@nestjs/common';

export class PdfHeaderConfigException extends UnprocessableEntityException {
  constructor(public readonly missingFields: string[]) {
    super(
      `No se puede generar el PDF: faltan campos obligatorios del encabezado corporativo (${missingFields.join(', ')}). No se genera un PDF sin branding.`,
    );
  }
}
