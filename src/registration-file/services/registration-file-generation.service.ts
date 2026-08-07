import { Injectable, Logger } from '@nestjs/common';
import { PdfGeneratorService } from 'src/shared/pdf/services/pdf-generator.service';
import { StorageService } from 'src/shared/storage/storage.service';

import { RegistrationFile } from '../entities/registration-file.entity';
import { RegistrationFileDocument } from '../entities/registration-file-document.entity';
import { ValidationResult } from '../validation-engine/validation-engine.types';
import { RegistrationGenerationResult } from '../domain/registration-provider.types';
import { buildRegistrationFilePdfInput } from '../templates/registration-file-pdf-input.builder';
import { pickLatestDocumentPerType } from '../utils/latest-documents.util';
import { REGISTRATION_FILE_DOCUMENT_FOLDER } from '../constants/registration-file-document-folder.map';

/**
 * `archiver` (v8+) es ESM-only (`"type": "module"`, sin factory `archiver('zip')`
 * — expone la clase `ZipArchive`). Bajo `module: "commonjs"` (tsconfig del
 * proyecto), TypeScript reescribe `await import(...)` como `require(...)`, lo
 * que revienta con ERR_REQUIRE_ESM. Mismo workaround que `music-metadata` en
 * `track-legal-proof.listener.ts`: pasar el specifier a través de `Function`
 * fuerza un `import()` nativo real.
 */
const importEsm = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<typeof import('archiver')>;

/**
 * Genera el PDF resumen + ZIP del expediente (sección "Generación del
 * Expediente" del requerimiento) y los sube a storage. El PDF se incluye
 * también dentro del ZIP junto con la última versión vigente de cada
 * documento tipificado, organizados por carpeta. No modifica ningún
 * documento oficial de SAYCO/DNDA — es un paquete de apoyo.
 */
@Injectable()
export class RegistrationFileGenerationService {
  private readonly logger = new Logger(RegistrationFileGenerationService.name);

  constructor(
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly storageService: StorageService,
  ) {}

  async generate(registrationFile: RegistrationFile, validation: ValidationResult): Promise<RegistrationGenerationResult> {
    const pdfInput = buildRegistrationFilePdfInput({ registrationFile, validation });
    const pdfBuffer = await this.pdfGeneratorService.generate(pdfInput);

    const pdfUpload = await this.storageService.uploadBuffer({
      key: `registration-file/${registrationFile.id}/expediente-${registrationFile.caseNumber}.pdf`,
      buffer: pdfBuffer,
      contentType: 'application/pdf',
    });

    const zipBuffer = await this.buildZip(registrationFile, pdfBuffer);
    const zipUpload = await this.storageService.uploadBuffer({
      key: `registration-file/${registrationFile.id}/expediente-${registrationFile.caseNumber}.zip`,
      buffer: zipBuffer,
      contentType: 'application/zip',
    });

    return { pdfKey: pdfUpload.key, pdfUrl: pdfUpload.publicUrl, zipKey: zipUpload.key, zipUrl: zipUpload.publicUrl };
  }

  private async buildZip(registrationFile: RegistrationFile, pdfBuffer: Buffer): Promise<Buffer> {
    const latestDocuments = pickLatestDocumentPerType(registrationFile.documents ?? []);
    const documentsWithBuffers = await Promise.all(
      latestDocuments.map(async (document) => ({ document, buffer: await this.downloadDocumentOrSkip(document) })),
    );

    const { ZipArchive } = await importEsm('archiver');

    return new Promise<Buffer>((resolve, reject) => {
      const archive = new ZipArchive({ zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('warning', (warning) =>
        this.logger.warn(`Advertencia generando ZIP del expediente ${registrationFile.id}: ${warning.message}`),
      );
      archive.on('error', (error) => reject(error));
      archive.on('end', () => resolve(Buffer.concat(chunks)));

      archive.append(pdfBuffer, { name: '00-resumen-expediente.pdf' });

      for (const { document, buffer } of documentsWithBuffers) {
        if (!buffer) continue;
        const folder = REGISTRATION_FILE_DOCUMENT_FOLDER[document.documentType];
        archive.append(buffer, { name: `${folder}/${document.fileName}` });
      }

      void archive.finalize();
    });
  }

  /** Un documento individual que no se pudo descargar no debe tumbar todo el paquete — se omite y se registra el error. */
  private async downloadDocumentOrSkip(document: RegistrationFileDocument): Promise<Buffer | null> {
    try {
      return await this.storageService.downloadObject(document.fileKey);
    } catch (error) {
      this.logger.error(
        `No se pudo descargar el documento ${document.id} (${document.fileKey}) para el ZIP del expediente`,
        error as Error,
      );
      return null;
    }
  }
}
