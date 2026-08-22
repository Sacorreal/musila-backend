/** Separado de `SocietyAffiliationStatus`: ACTIVE no implica VERIFIED (§6, §11). */
export enum SocietyAffiliationVerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  DECLARED = 'DECLARED',
  DOCUMENT_SUPPORTED = 'DOCUMENT_SUPPORTED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}
