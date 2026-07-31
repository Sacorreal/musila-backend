import { PdfBodyContentType } from 'src/shared/pdf/enums/pdf-body-content-type.enum';
import { PdfGenerateInput } from 'src/shared/pdf/interfaces/pdf-generate-input.interface';
import { CertificateTrackSnapshot } from '../entities/certificate.entity';
import { CertificateRecipient } from '../entities/certificate-recipient.entity';
import { CERTIFICATE_LEGAL_TEXT, CERTIFICATE_REGISTRY_LABEL } from '../constants/certificate.constants';

const FALLBACK = '—';

function formatPublishedAt(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

export interface BuildCertificatePdfInputParams {
  registryNumber: string;
  recipients: CertificateRecipient[];
  trackSnapshot: CertificateTrackSnapshot;
  sealImageUrl?: string;
}

/**
 * Función pura: arma el `PdfGenerateInput` de las 3 filas del Certificado
 * de Autoría (autores / obra / footer legal) a partir de los datos ya
 * persistidos. No hace I/O — separa la construcción del contenido de su
 * generación real (`PdfGeneratorService`), igual que
 * `buildLicenseContractParagraphs` en `license-contracts/templates/`.
 */
export function buildCertificatePdfInput(params: BuildCertificatePdfInputParams): PdfGenerateInput {
  const { registryNumber, recipients, trackSnapshot, sealImageUrl } = params;

  return {
    documentTitle: `Certificado de Autoría — ${trackSnapshot.title}`,
    body: [
      { type: PdfBodyContentType.TEXT, paragraphs: ['1. Autor(es)'] },
      {
        type: PdfBodyContentType.TABLE,
        columns: [
          { key: 'fullName', header: 'Nombre completo' },
          { key: 'idType', header: 'Tipo de ID' },
          { key: 'idNumber', header: 'N° de identificación' },
          { key: 'musilaCreatorId', header: 'Musila Creator ID' },
        ],
        rows: recipients.map((r) => ({
          fullName: r.fullName,
          idType: r.typeCitizenId ?? FALLBACK,
          idNumber: r.citizenId ?? FALLBACK,
          musilaCreatorId: r.musilaCreatorId ?? FALLBACK,
        })),
      },
      { type: PdfBodyContentType.TEXT, paragraphs: ['2. Datos de la obra'] },
      {
        type: PdfBodyContentType.TABLE,
        columns: [
          { key: 'title', header: 'Título' },
          { key: 'publishedAt', header: 'Fecha de publicación' },
          { key: 'genre', header: 'Género' },
          { key: 'subGenre', header: 'Subgénero' },
          { key: 'trackId', header: 'ID de la canción' },
        ],
        rows: [
          {
            title: trackSnapshot.title,
            publishedAt: formatPublishedAt(trackSnapshot.publishedAt),
            genre: trackSnapshot.genre,
            subGenre: trackSnapshot.subGenre ?? FALLBACK,
            trackId: trackSnapshot.trackId,
          },
        ],
      },
    ],
    footer: {
      sealImageUrl,
      legalText: CERTIFICATE_LEGAL_TEXT,
      registryLabel: CERTIFICATE_REGISTRY_LABEL,
      registryCode: registryNumber,
    },
    metadata: {
      title: `Certificado de Autoría — ${trackSnapshot.title}`,
      author: 'Musila',
      generatedAt: new Date(),
    },
  };
}
