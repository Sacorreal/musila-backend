/**
 * Mapeo conceptual CWR (§4 del requerimiento):
 * PR → `PR Affiliation Society` (ejecución pública)
 * MR → `MR Affiliation Society` (derechos mecánicos)
 * SR → `SR Affiliation Society` (sincronización)
 */
export enum SocietyAffiliationRightsType {
  PR = 'PR',
  MR = 'MR',
  SR = 'SR',
}
