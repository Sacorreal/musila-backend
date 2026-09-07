import * as fs from 'fs';
import * as path from 'path';
import { Injectable, Logger } from '@nestjs/common';
import { PdfHeaderConfig } from '../interfaces/pdf-header-config.interface';
import { PdfHeaderConfigException } from '../exceptions/pdf-header-config.exception';
import {
  PDF_CONFIG_PATH_SEGMENTS,
  PDF_DEFAULT_BRANDING,
  PDF_HEADER_REQUIRED_FIELDS,
  PDF_LOGO_PENDING_UPLOAD_SENTINEL,
} from '../constants/pdf.constants';

@Injectable()
export class PdfConfigService {
  private readonly logger = new Logger(PdfConfigService.name);
  private cachedConfig: Readonly<PdfHeaderConfig> | null = null;

  /**
   * Devuelve la configuración del encabezado corporativo, cacheada en
   * memoria tras la primera lectura (singleton, inmutable).
   *
   * @throws {PdfHeaderConfigException} si a los campos obligatorios
   * ({@link PDF_HEADER_REQUIRED_FIELDS}) les falta un valor real —
   * nunca se genera un PDF sin branding completo.
   */
  getHeaderConfig(): PdfHeaderConfig {
    if (!this.cachedConfig) {
      this.cachedConfig = Object.freeze(this.loadConfig());
    }

    const missing = PDF_HEADER_REQUIRED_FIELDS.filter((field) => this.isMissing(this.cachedConfig![field]));
    if (missing.length > 0) {
      throw new PdfHeaderConfigException(missing);
    }

    return this.cachedConfig;
  }

  private loadConfig(): PdfHeaderConfig {
    try {
      const raw = fs.readFileSync(this.resolveConfigPath(), 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PdfHeaderConfig>;
      return {
        slogan: PDF_DEFAULT_BRANDING.slogan,
        brandColor: PDF_DEFAULT_BRANDING.brandColor,
        ...parsed,
      } as PdfHeaderConfig;
    } catch (error) {
      this.logger.warn(
        `No se pudo leer o parsear pdf-branding.config.json, usando valores por defecto: ${(error as Error).message}`,
      );
      return { ...PDF_DEFAULT_BRANDING };
    }
  }

  private isMissing(value: unknown): boolean {
    return !value || value === PDF_LOGO_PENDING_UPLOAD_SENTINEL;
  }

  private resolveConfigPath(): string {
    return path.join(process.cwd(), ...PDF_CONFIG_PATH_SEGMENTS);
  }
}
