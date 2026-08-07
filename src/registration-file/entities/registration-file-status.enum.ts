/**
 * Estado global de *preparación* del expediente (no de presentación/registro
 * ante cada entidad — eso vive en `RegistrationFileProfileSubmissionStatus`,
 * uno por perfil activo, porque SAYCO y DNDA se presentan/registran en
 * momentos distintos).
 */
export enum RegistrationFileStatus {
  EN_CONSTRUCCION = 'en_construccion',
  INCOMPLETO = 'incompleto',
  VALIDADO_PARCIALMENTE = 'validado_parcialmente',
  LISTO_PARA_PRESENTAR = 'listo_para_presentar',
}
