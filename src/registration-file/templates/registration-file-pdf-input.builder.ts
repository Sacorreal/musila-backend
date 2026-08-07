import { PdfBodyContentType } from 'src/shared/pdf/enums/pdf-body-content-type.enum';
import { PdfGenerateInput } from 'src/shared/pdf/interfaces/pdf-generate-input.interface';
import { RegistrationFile } from '../entities/registration-file.entity';
import { REGISTRATION_DOMAIN_LABELS } from '../validation-engine/registration-domain.enum';
import { ValidationResult } from '../validation-engine/validation-engine.types';
import { pickLatestDocumentPerType } from '../utils/latest-documents.util';
import { REGISTRATION_FILE_DOCUMENT_TYPE_LABELS, REGISTRATION_FILE_LEGAL_NOTICE } from '../constants/registration-file.constants';

export interface BuildRegistrationFilePdfInputParams {
  registrationFile: RegistrationFile;
  validation: ValidationResult;
}

/**
 * Función pura: arma el `PdfGenerateInput` del PDF resumen del expediente
 * (índice documental, resumen por dominio, participantes, checklist, aviso
 * legal). No hace I/O — separa la construcción del contenido de su
 * generación real (`PdfGeneratorService`), igual que `buildCertificatePdfInput`.
 */
export function buildRegistrationFilePdfInput(params: BuildRegistrationFilePdfInputParams): PdfGenerateInput {
  const { registrationFile, validation } = params;

  const summaryRows = validation.domains.map((domain) => ({
    dominio: REGISTRATION_DOMAIN_LABELS[domain.domain],
    completitud: domain.applicable ? `${domain.percentage}%` : 'No aplica',
  }));

  const participantRows = registrationFile.participants?.length
    ? registrationFile.participants.map((participant) => ({
        nombre: participant.fullName,
        rol: participant.role,
        per: `${participant.authorialPercentage}%`,
        mec: `${participant.mechanicalPercentage}%`,
      }))
    : [{ nombre: 'Sin participantes registrados', rol: '—', per: '—', mec: '—' }];

  const latestDocuments = pickLatestDocumentPerType(registrationFile.documents ?? []);
  const documentRows = latestDocuments.length
    ? latestDocuments.map((document) => ({
        tipo: REGISTRATION_FILE_DOCUMENT_TYPE_LABELS[document.documentType],
        version: String(document.version),
        estado: document.status,
      }))
    : [{ tipo: 'Sin documentos cargados', version: '—', estado: '—' }];

  const checklistItems = validation.checklist.length
    ? validation.checklist.map((item) => `${item.satisfied ? '✔' : '⚠'} ${item.label}`)
    : ['✔ Sin observaciones'];

  return {
    documentTitle: `Expediente de Registro ${registrationFile.caseNumber} — ${registrationFile.title}`,
    body: [
      {
        type: PdfBodyContentType.TEXT,
        paragraphs: [
          `Perfiles activos: ${registrationFile.activeProfileKeys.join(', ')}`,
          `Completitud global: ${validation.overallPercentage}%`,
        ],
      },
      { type: PdfBodyContentType.TEXT, paragraphs: ['Resumen por dominio'] },
      {
        type: PdfBodyContentType.TABLE,
        columns: [
          { key: 'dominio', header: 'Dominio' },
          { key: 'completitud', header: 'Completitud' },
        ],
        rows: summaryRows,
      },
      { type: PdfBodyContentType.TEXT, paragraphs: ['Relación de participantes'] },
      {
        type: PdfBodyContentType.TABLE,
        columns: [
          { key: 'nombre', header: 'Nombre' },
          { key: 'rol', header: 'Rol' },
          { key: 'per', header: '% PER' },
          { key: 'mec', header: '% MEC' },
        ],
        rows: participantRows,
      },
      { type: PdfBodyContentType.TEXT, paragraphs: ['Índice documental'] },
      {
        type: PdfBodyContentType.TABLE,
        columns: [
          { key: 'tipo', header: 'Tipo documental' },
          { key: 'version', header: 'Versión' },
          { key: 'estado', header: 'Estado' },
        ],
        rows: documentRows,
      },
      { type: PdfBodyContentType.TEXT, paragraphs: ['Checklist final'] },
      { type: PdfBodyContentType.LIST, items: checklistItems },
      { type: PdfBodyContentType.TEXT, paragraphs: [REGISTRATION_FILE_LEGAL_NOTICE] },
    ],
    metadata: {
      title: `Expediente de Registro ${registrationFile.caseNumber}`,
      author: 'Musila',
      generatedAt: new Date(),
    },
  };
}
