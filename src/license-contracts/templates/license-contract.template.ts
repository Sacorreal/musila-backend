import { LicenseTerritoryMode } from '../entities/license-territory-mode.enum';
import { LicenseDistributionFormat } from '../entities/license-distribution-format.enum';

const DISTRIBUTION_FORMAT_LABELS: Record<LicenseDistributionFormat, string> = {
  [LicenseDistributionFormat.STREAMING]: 'streaming',
  [LicenseDistributionFormat.DOWNLOAD]: 'descarga digital',
  [LicenseDistributionFormat.PHYSICAL]: 'formato físico',
};

export interface LicenseContractTemplateAuthor {
  legalName: string;
  citizenId?: string | null;
  ipiNumber?: string | null;
  proSociety?: string | null;
  publisher?: string | null;
  role: string;
  percentage: number;
}

export interface LicenseContractTemplateSignature {
  name: string;
  roleLabel: string;
  signedAt: Date;
}

export interface LicenseContractTemplateInput {
  trackTitle: string;
  genreName?: string | null;
  language: string;
  iswc?: string | null;
  authors: LicenseContractTemplateAuthor[];
  licensee: { legalName: string; citizenId?: string | null; email: string };
  validityDate: Date;
  territoryMode: LicenseTerritoryMode;
  territoryCountries?: string[] | null;
  advanceAmount: number;
  advanceCurrency: string;
  installments: { amount: number; dueDate: Date }[];
  commissionAmount: number;
  totalPayableByLicensee: number;
  royaltyPercentage: number;
  distributionFormats: LicenseDistributionFormat[];
  advanceDistribution?: { authorName: string; percentage: number }[] | null;
  generatedAt: Date;
  /** Solo presente en la versión final, una vez que todas las partes firmaron. */
  signatures?: LicenseContractTemplateSignature[];
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function describeTerritory(mode: LicenseTerritoryMode, countries?: string[] | null): string {
  if (mode === LicenseTerritoryMode.GLOBAL) return 'MUNDIAL';
  return countries && countries.length > 0 ? countries.join(', ') : 'Territorios específicos por definir';
}

function describeDistributionFormats(formats: LicenseDistributionFormat[]): string {
  return formats.map((format) => DISTRIBUTION_FORMAT_LABELS[format]).join(', ');
}

function describeAuthor(author: LicenseContractTemplateAuthor): string {
  const parts = [
    `Nombre: ${author.legalName}`,
    author.citizenId ? `Documento: ${author.citizenId}` : 'Documento: por asignar',
    `Rol: ${author.role}`,
    `Participación: ${author.percentage}%`,
    author.ipiNumber ? `IPI/CAE: ${author.ipiNumber}` : null,
    author.proSociety ? `PRO: ${author.proSociety}` : null,
    author.publisher ? `Editora: ${author.publisher}` : null,
  ].filter(Boolean);
  return parts.join(' — ');
}

/**
 * Ensambla el texto del Contrato de Licencia de Primer Uso (plantilla de la
 * sección 2 del documento fuente) con los datos ya resueltos del track,
 * autores/coautores, intérprete y términos negociados. Función pura: no
 * accede a base de datos ni a storage — solo formatea texto.
 */
export function buildLicenseContractParagraphs(input: LicenseContractTemplateInput): string[] {
  const primaryAuthor = input.authors[0];
  const coauthors = input.authors.slice(1);
  const hasInstallments = input.installments.length > 1;

  const paragraphs: string[] = [
    'CONTRATO DE LICENCIA DE PRIMER USO (Licencia Mecánica para Grabación de Composición Musical Inédita)',

    `Entre EL LICENCIANTE — ${describeAuthor(primaryAuthor)} — ${coauthors.length > 0 ? `junto con los coautores listados en el Anexo 1 (${coauthors.map((a) => a.legalName).join(', ')})` : 'único autor de la obra'} — y EL LICENCIATARIO — Nombre: ${input.licensee.legalName}, Documento: ${input.licensee.citizenId ?? 'por asignar'}, Correo: ${input.licensee.email} — han acordado celebrar el presente CONTRATO DE LICENCIA DE PRIMER USO, que se regirá por las siguientes cláusulas:`,

    `PRIMERA — OBJETO. EL LICENCIANTE otorga a favor de EL LICENCIATARIO una licencia voluntaria para la primera fijación fonográfica, reproducción, distribución y comunicación pública de la obra musical inédita "${input.trackTitle}" (en adelante, "La Obra"), descrita en el Anexo 1.`,

    'SEGUNDA — DECLARACIÓN DE ORIGINALIDAD Y TITULARIDAD. EL LICENCIANTE declara bajo la gravedad de juramento que: a) es el autor original y/o titular legítimo de los derechos patrimoniales de LA OBRA; b) LA OBRA no cuenta con ISRC asignado ya que no ha sido previamente grabada, publicada ni distribuida en ningún formato o territorio; c) LA OBRA no infringe derechos de autor de terceros, no contiene material plagiado ni muestreado sin autorización, ni está sujeta a litigios o reclamaciones de terceros; d) de existir coautores, todos han autorizado expresamente esta licencia (Anexo 2 — Consentimiento de Coautores).',

    `TERCERA — ALCANCE DE LA LICENCIA. La presente licencia autoriza exclusivamente: a) la grabación de LA OBRA por parte de EL LICENCIATARIO o de terceros bajo su dirección; b) la reproducción y distribución del fonograma resultante en los siguientes formatos: ${describeDistributionFormats(input.distributionFormats)}. No incluye derechos de sincronización audiovisual, ejecución pública, ni licencias sobre grabaciones distintas a la aquí autorizada. Cualquier uso adicional requerirá un acuerdo específico y separado directamente con el autor o los autores.`,

    `CUARTA — VIGENCIA Y TERRITORIO. Territorio: ${describeTerritory(input.territoryMode, input.territoryCountries)}. Vigencia: esta licencia tiene vigencia hasta el ${formatDate(input.validityDate)}, plazo dentro del cual EL LICENCIATARIO debe asignar el ISRC de la grabación resultante. Vencido el plazo sin que se haya asignado el ISRC, la licencia se dará por no cumplida de pleno derecho y EL LICENCIANTE podrá ofrecerla a otro licenciatario.`,

    `QUINTA — CONTRAPRESTACIÓN Y REGALÍAS. EL LICENCIATARIO pagará a EL LICENCIANTE: ${
      input.advanceAmount > 0
        ? `un anticipo de ${formatCurrency(input.advanceAmount, input.advanceCurrency)}${
            hasInstallments
              ? `, pagadero en ${input.installments.length} cuotas: ${input.installments
                  .map((i, idx) => `cuota ${idx + 1} de ${formatCurrency(i.amount, input.advanceCurrency)} el ${formatDate(i.dueDate)}`)
                  .join('; ')}`
              : `, pagadero en una sola cuota el ${formatDate(input.installments[0]?.dueDate ?? input.validityDate)}`
          } (valor recibido por EL LICENCIANTE; EL LICENCIATARIO asume además una comisión de plataforma de ${formatCurrency(input.commissionAmount, input.advanceCurrency)}, para un total a pagar de ${formatCurrency(input.totalPayableByLicensee, input.advanceCurrency)}); y `
        : 'sin anticipo (EL LICENCIANTE no cobra anticipo por el uso de su canción); y '
    }una regalía mecánica equivalente al ${input.royaltyPercentage}% de los ingresos netos generados por la explotación del fonograma a perpetuidad.${
      input.advanceDistribution && input.advanceDistribution.length > 0
        ? ` El anticipo se distribuye entre los autores así: ${input.advanceDistribution
            .map((d) => `${d.authorName} (${d.percentage}%)`)
            .join(', ')}.`
        : ''
    }`,

    'SEXTA — CRÉDITOS. EL LICENCIATARIO se compromete a incluir el crédito de autoría de EL LICENCIANTE y los coautores como compositor(es) en todos los metadatos, plataformas de distribución digital, PRO y demás registros correspondientes, utilizando el nombre y los datos consignados en el Anexo 1 y 2. Debe respetar la integridad de La Obra: cualquier modificación estructural, arreglo sustancial o adaptación requerirá la autorización previa y escrita de EL LICENCIANTE.',

    'SÉPTIMA — TERMINACIÓN. Este contrato podrá terminarse por: (a) mutuo acuerdo escrito entre las partes; (b) incumplimiento grave de cualquiera de las obligaciones aquí pactadas, previa notificación; (c) las demás causales previstas en la ley colombiana aplicable.',

    'OCTAVA — LEY APLICABLE Y JURISDICCIÓN. Este contrato se rige por las leyes de la República de Colombia, en particular la Ley 23 de 1982, la Decisión 351 de la Comunidad Andina y demás normas concordantes sobre derechos de autor. Cualquier controversia se someterá primeramente a un proceso de conciliación en el Centro de Arbitraje y Conciliación de la Cámara de Comercio de Bogotá. De no llegar a un acuerdo, la disputa será resuelta por los tribunales ordinarios de la ciudad de Bogotá D.C., Colombia.',

    'NOVENA — GARANTÍA DE AUTORÍA E INDEMNIDAD. EL LICENCIANTE garantiza que la obra es original e inédita y no viola derechos de terceros. En consecuencia, mantendrá indemne a EL LICENCIATARIO frente a cualquier reclamación judicial o extrajudicial derivada de la autoría.',

    'DÉCIMA — FORMACIÓN ELECTRÓNICA DEL CONTRATO. Las partes reconocen expresamente que el presente contrato ha sido firmado, aceptado y suscrito por medio de mensajes de datos y firma electrónica, de conformidad con los artículos 10, 14 y 15 de la Ley 527 de 1999, y que dicha circunstancia no afecta su validez, eficacia ni fuerza obligatoria y probatoria.',

    `Nota legal: la presente licencia no transfiere ni cede la titularidad de los derechos patrimoniales sobre La Obra. Documento generado por Músila el ${formatDateTime(input.generatedAt)}.`,

    'ANEXO 1 — METADATOS DE LA OBRA',
    `Título: ${input.trackTitle}. Género: ${input.genreName ?? 'no especificado'}. Idioma: ${input.language}. ISWC: ${input.iswc ?? 'por asignar'}.`,
    `Autoría: ${input.authors.map(describeAuthor).join(' | ')}`,
    `Intérprete/Licenciatario: ${input.licensee.legalName}, Documento: ${input.licensee.citizenId ?? 'por asignar'}, Correo: ${input.licensee.email}.`,

    'ANEXO 2 — CONSENTIMIENTO DE COAUTORES',
    coauthors.length > 0
      ? `Cada coautor firma electrónicamente su autorización individual: ${coauthors.map((a) => a.legalName).join(', ')}.`
      : 'No aplica: la obra tiene un único autor.',
  ];

  if (input.signatures && input.signatures.length > 0) {
    paragraphs.push('FIRMAS ELECTRÓNICAS');
    for (const signature of input.signatures) {
      paragraphs.push(
        `${signature.roleLabel} — ${signature.name} — firmado electrónicamente el ${formatDateTime(signature.signedAt)}.`,
      );
    }
  }

  return paragraphs;
}
