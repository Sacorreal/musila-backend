/**
 * Catálogo país (ISO 3166-1 alpha-2) → tipo(s) de documento de identificación
 * tributaria de una empresa, usado por `createBusinessForm`
 * (`requerimientos/B2B/registro-legal-b2b.md` §1). Cobertura explícita para
 * LATAM y otros mercados relevantes para Musila; el resto del mundo cae en
 * `TAX_ID_GENERIC`. Espejo exacto en
 * `musila-web-app/src/domains/organizations/constants/business-document-catalog.ts`
 * — cualquier cambio aquí debe replicarse allá.
 */
export enum BusinessDocumentType {
  /** Colombia — Número de Identificación Tributaria. */
  NIT = 'NIT',
  /** Ecuador, Perú — Registro Único de Contribuyentes. */
  RUC = 'RUC',
  /** México — Registro Federal de Contribuyentes. */
  RFC = 'RFC',
  /** Brasil — Cadastro Nacional da Pessoa Jurídica. */
  CNPJ = 'CNPJ',
  /** España — Código de Identificación Fiscal. */
  CIF = 'CIF',
  /** Estados Unidos — Employer Identification Number. */
  EIN = 'EIN',
  /** Chile — Rol Único Tributario. */
  RUT_CL = 'RUT_CL',
  /** Argentina — Clave Única de Identificación Tributaria. */
  CUIT = 'CUIT',
  /** Fallback genérico para países sin catálogo explícito. */
  TAX_ID_GENERIC = 'TAX_ID_GENERIC',
}

export const BUSINESS_DOCUMENT_TYPE_LABELS: Record<BusinessDocumentType, string> = {
  [BusinessDocumentType.NIT]: 'NIT (Número de Identificación Tributaria)',
  [BusinessDocumentType.RUC]: 'RUC (Registro Único de Contribuyentes)',
  [BusinessDocumentType.RFC]: 'RFC (Registro Federal de Contribuyentes)',
  [BusinessDocumentType.CNPJ]: 'CNPJ (Cadastro Nacional da Pessoa Jurídica)',
  [BusinessDocumentType.CIF]: 'CIF (Código de Identificación Fiscal)',
  [BusinessDocumentType.EIN]: 'EIN (Employer Identification Number)',
  [BusinessDocumentType.RUT_CL]: 'RUT (Rol Único Tributario)',
  [BusinessDocumentType.CUIT]: 'CUIT (Clave Única de Identificación Tributaria)',
  [BusinessDocumentType.TAX_ID_GENERIC]: 'Tax ID / Business Registration Number',
};

/** Países (ISO alpha-2) con tipo de documento de empresa controlado. */
export const COUNTRY_DOCUMENT_TYPES: Record<string, BusinessDocumentType[]> = {
  CO: [BusinessDocumentType.NIT],
  EC: [BusinessDocumentType.RUC],
  PE: [BusinessDocumentType.RUC],
  MX: [BusinessDocumentType.RFC],
  BR: [BusinessDocumentType.CNPJ],
  ES: [BusinessDocumentType.CIF],
  US: [BusinessDocumentType.EIN],
  CL: [BusinessDocumentType.RUT_CL],
  AR: [BusinessDocumentType.CUIT],
};

/** Tipos de documento válidos para un país; fallback genérico si no está en el catálogo. */
export function allowedDocumentTypesFor(countryCode: string): BusinessDocumentType[] {
  return COUNTRY_DOCUMENT_TYPES[countryCode?.toUpperCase()] ?? [BusinessDocumentType.TAX_ID_GENERIC];
}

/** ¿`documentType` es válido para `countryCode`? */
export function isValidDocumentTypeForCountry(
  countryCode: string,
  documentType: BusinessDocumentType,
): boolean {
  return allowedDocumentTypesFor(countryCode).includes(documentType);
}
