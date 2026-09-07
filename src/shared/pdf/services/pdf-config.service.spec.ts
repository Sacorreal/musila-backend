jest.mock('fs');

import * as fs from 'fs';
import { Logger } from '@nestjs/common';
import { PdfConfigService } from './pdf-config.service';
import { PdfHeaderConfigException } from '../exceptions/pdf-header-config.exception';

const readFileSyncMock = fs.readFileSync as jest.Mock;

describe('PdfConfigService', () => {
  let service: PdfConfigService;

  beforeEach(() => {
    service = new PdfConfigService();
    readFileSyncMock.mockReset();
    jest.restoreAllMocks();
  });

  it('devuelve la config cuando el JSON es válido y completo', () => {
    const validJson = JSON.stringify({
      companyName: 'Musila',
      logoUrl: 'https://cdn.example.com/logo.png',
      slogan: 'musila.co',
      contactEmail: 'soporte@musila.co',
      brandColor: '#7c3aed',
    });
    readFileSyncMock.mockReturnValue(validJson);

    const config = service.getHeaderConfig();

    expect(config.companyName).toBe('Musila');
    expect(config.logoUrl).toBe('https://cdn.example.com/logo.png');
  });

  it('cae a los valores por defecto y registra un warning si el JSON no parsea (pero igual falla por logo pendiente)', () => {
    readFileSyncMock.mockReturnValue('{ esto no es json válido');
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    expect(() => service.getHeaderConfig()).toThrow(PdfHeaderConfigException);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('cae a los valores por defecto si el archivo no existe (ENOENT)', () => {
    readFileSyncMock.mockImplementation(() => {
      const error = new Error('no such file') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      throw error;
    });
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    expect(() => service.getHeaderConfig()).toThrow(PdfHeaderConfigException);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('lanza PdfHeaderConfigException si el JSON es válido pero le faltan campos obligatorios', () => {
    const incompleteJson = JSON.stringify({ companyName: 'Musila' });
    readFileSyncMock.mockReturnValue(incompleteJson);

    expect.assertions(2);
    try {
      service.getHeaderConfig();
    } catch (error) {
      expect(error).toBeInstanceOf(PdfHeaderConfigException);
      expect((error as PdfHeaderConfigException).missingFields).toEqual(
        expect.arrayContaining(['logoUrl', 'contactEmail']),
      );
    }
  });

  it('lanza la excepción con el centinela de logo pendiente, no en el constructor sino al invocar getHeaderConfig', () => {
    const jsonWithSentinel = JSON.stringify({
      companyName: 'Musila',
      logoUrl: '__PENDING_LOGO_UPLOAD__',
      contactEmail: 'soporte@musila.co',
    });
    readFileSyncMock.mockReturnValue(jsonWithSentinel);

    expect(() => new PdfConfigService()).not.toThrow();
    const freshService = new PdfConfigService();
    expect(() => freshService.getHeaderConfig()).toThrow(PdfHeaderConfigException);
  });

  it('lee el archivo una sola vez pese a múltiples invocaciones (cache en memoria)', () => {
    const validJson = JSON.stringify({
      companyName: 'Musila',
      logoUrl: 'https://cdn.example.com/logo.png',
      contactEmail: 'soporte@musila.co',
    });
    readFileSyncMock.mockReturnValue(validJson);

    service.getHeaderConfig();
    service.getHeaderConfig();
    service.getHeaderConfig();

    expect(readFileSyncMock).toHaveBeenCalledTimes(1);
  });

  it('devuelve una config inmutable (Object.isFrozen)', () => {
    const validJson = JSON.stringify({
      companyName: 'Musila',
      logoUrl: 'https://cdn.example.com/logo.png',
      contactEmail: 'soporte@musila.co',
    });
    readFileSyncMock.mockReturnValue(validJson);

    const config = service.getHeaderConfig();

    expect(Object.isFrozen(config)).toBe(true);
  });
});
