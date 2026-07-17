import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { renderToBuffer } from '@react-pdf/renderer';
import { PdfConfigService } from './pdf-config.service';
import { PdfInputValidatorService } from './pdf-input-validator.service';
import { PdfDocumentTemplate } from '../templates/pdf-document.template';
import { PdfGenerateInput } from '../interfaces/pdf-generate-input.interface';

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  constructor(
    private readonly configService: PdfConfigService,
    private readonly validator: PdfInputValidatorService,
  ) {}

  /**
   * Genera un PDF con el encabezado corporativo (logo + datos de la
   * empresa) inyectado automáticamente en todas las páginas. Valida el
   * input antes de tocar cualquier recurso; si el encabezado no está
   * completo, no genera ningún PDF parcial.
   *
   * @throws {PdfValidationException} si el input no cumple el esquema de la plantilla
   * @throws {PdfHeaderConfigException} si faltan campos obligatorios del branding
   */
  async generate(input: PdfGenerateInput): Promise<Buffer> {
    this.validator.validate(input);
    const headerConfig = this.configService.getHeaderConfig();

    this.logger.log(`Generando PDF "${input.documentTitle}" (tipo=${input.body.type})`);

    const element = React.createElement(PdfDocumentTemplate, {
      headerConfig,
      documentTitle: input.documentTitle,
      body: input.body,
      metadata: input.metadata,
    });

    try {
      const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
      this.logger.log(`PDF generado (${buffer.length} bytes)`);
      return buffer;
    } catch (error) {
      this.logger.error(`Error renderizando PDF "${input.documentTitle}": ${(error as Error).message}`);
      throw new InternalServerErrorException('No se pudo generar el documento PDF');
    }
  }

  /**
   * Igual que {@link generate}, pero persiste el resultado en disco y
   * devuelve la ruta absoluta del archivo escrito.
   */
  async generateToFile(input: PdfGenerateInput, filePath: string): Promise<string> {
    const buffer = await this.generate(input);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, buffer);
    return filePath;
  }
}
