jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
  },
}));
jest.mock('@react-pdf/renderer', () => {
  const actual: typeof import('@react-pdf/renderer') = jest.requireActual('@react-pdf/renderer');
  return { ...actual, renderToBuffer: jest.fn() };
});

import * as fs from 'fs';
import { renderToBuffer } from '@react-pdf/renderer';
import { InternalServerErrorException } from '@nestjs/common';
import { PdfGeneratorService } from './pdf-generator.service';
import { PdfBodyContentType } from '../enums/pdf-body-content-type.enum';
import { PdfGenerateInput } from '../interfaces/pdf-generate-input.interface';
import { PdfHeaderConfig } from '../interfaces/pdf-header-config.interface';

const renderToBufferMock = renderToBuffer as jest.Mock;
const actualRenderToBuffer = jest.requireActual('@react-pdf/renderer').renderToBuffer as typeof renderToBuffer;

describe('PdfGeneratorService', () => {
  let service: PdfGeneratorService;
  let configService: { getHeaderConfig: jest.Mock };
  let validator: { validate: jest.Mock };

  const validHeaderConfig: PdfHeaderConfig = {
    companyName: 'Musila',
    logoUrl: `data:image/png;base64,${Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21,
      196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69,
      78, 68, 174, 66, 96, 130,
    ]).toString('base64')}`,
    slogan: 'musila.co',
    contactEmail: 'soporte@musila.co',
    brandColor: '#7c3aed',
  };

  const textInput: PdfGenerateInput = {
    documentTitle: 'Documento de prueba',
    body: { type: PdfBodyContentType.TEXT, paragraphs: ['Hola mundo'] },
  };

  beforeEach(() => {
    configService = { getHeaderConfig: jest.fn().mockReturnValue(validHeaderConfig) };
    validator = { validate: jest.fn() };
    service = new PdfGeneratorService(configService as any, validator as any);
    renderToBufferMock.mockReset();
    (fs.promises.mkdir as jest.Mock).mockReset().mockResolvedValue(undefined);
    (fs.promises.writeFile as jest.Mock).mockReset().mockResolvedValue(undefined);
  });

  describe('generate (unitario, renderToBuffer mockeado)', () => {
    it('valida el input, obtiene la config del header y devuelve el buffer generado', async () => {
      const fakeBuffer = Buffer.from('fake-pdf-bytes');
      renderToBufferMock.mockResolvedValue(fakeBuffer);

      const result = await service.generate(textInput);

      expect(validator.validate).toHaveBeenCalledWith(textInput);
      expect(configService.getHeaderConfig).toHaveBeenCalled();
      expect(renderToBufferMock).toHaveBeenCalled();
      expect(result).toBe(fakeBuffer);
    });

    it('no consulta la config ni renderiza si la validación falla', async () => {
      const validationError = new Error('input inválido');
      validator.validate.mockImplementation(() => {
        throw validationError;
      });

      await expect(service.generate(textInput)).rejects.toThrow(validationError);
      expect(configService.getHeaderConfig).not.toHaveBeenCalled();
      expect(renderToBufferMock).not.toHaveBeenCalled();
    });

    it('no renderiza si la config del header falla', async () => {
      const configError = new Error('config incompleta');
      configService.getHeaderConfig.mockImplementation(() => {
        throw configError;
      });

      await expect(service.generate(textInput)).rejects.toThrow(configError);
      expect(renderToBufferMock).not.toHaveBeenCalled();
    });

    it('envuelve un fallo de renderToBuffer en InternalServerErrorException', async () => {
      renderToBufferMock.mockRejectedValue(new Error('fallo interno de render'));

      await expect(service.generate(textInput)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('generateToFile', () => {
    it('genera el buffer, crea el directorio y escribe el archivo', async () => {
      const fakeBuffer = Buffer.from('fake-pdf-bytes');
      renderToBufferMock.mockResolvedValue(fakeBuffer);

      const result = await service.generateToFile(textInput, '/tmp/output/doc.pdf');

      expect(fs.promises.mkdir).toHaveBeenCalledWith('/tmp/output', { recursive: true });
      expect(fs.promises.writeFile).toHaveBeenCalledWith('/tmp/output/doc.pdf', fakeBuffer);
      expect(result).toBe('/tmp/output/doc.pdf');
    });
  });

  describe('integración real (sin mockear renderToBuffer)', () => {
    beforeEach(() => {
      renderToBufferMock.mockImplementation(actualRenderToBuffer);
    });

    it('genera un PDF real y válido para una plantilla de tabla', async () => {
      const buffer = await service.generate({
        documentTitle: 'Reporte de tracks',
        body: {
          type: PdfBodyContentType.TABLE,
          columns: [
            { key: 'title', header: 'Título' },
            { key: 'author', header: 'Autor' },
          ],
          rows: [
            { title: 'Canción 1', author: 'Autor 1' },
            { title: 'Canción 2', author: 'Autor 2' },
          ],
        },
      });

      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('genera un PDF real y válido para una plantilla de texto', async () => {
      const buffer = await service.generate(textInput);

      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
