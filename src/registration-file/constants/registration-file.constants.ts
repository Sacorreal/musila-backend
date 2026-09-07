import { RegistrationFileDocumentType } from '../entities/registration-file-document-type.enum';

export const REGISTRATION_FILE_DOCUMENT_TYPE_LABELS: Record<RegistrationFileDocumentType, string> = {
  [RegistrationFileDocumentType.LETRA]: 'Letra de la obra',
  [RegistrationFileDocumentType.PARTITURA]: 'Partitura',
  [RegistrationFileDocumentType.AUDIO_MP3]: 'Audio (MP3)',
  [RegistrationFileDocumentType.AUDIO_WAV]: 'Audio (WAV)',
  [RegistrationFileDocumentType.CARATULA]: 'Carátula',
  [RegistrationFileDocumentType.CONTRATO_EDITORIAL]: 'Contrato Editorial',
  [RegistrationFileDocumentType.CONTRATO_ENCARGO]: 'Contrato por Encargo',
  [RegistrationFileDocumentType.REGISTRO_DNDA]: 'Certificado de Registro DNDA',
  [RegistrationFileDocumentType.DECLARACION_SAYCO]: 'Declaración SAYCO',
  [RegistrationFileDocumentType.AUTORIZACION]: 'Autorización',
  [RegistrationFileDocumentType.LICENCIA]: 'Licencia',
  [RegistrationFileDocumentType.CERTIFICADO_PI]: 'Certificado de Registro de Propiedad Intelectual',
  [RegistrationFileDocumentType.OTRO]: 'Otro',
};

export const REGISTRATION_FILE_LEGAL_NOTICE =
  'Este documento es un expediente de apoyo preparado por Musila para facilitar el registro manual ante ' +
  'SAYCO y/o la Dirección Nacional de Derecho de Autor (DNDA). No constituye un registro oficial ni reemplaza ' +
  'el trámite ante la entidad correspondiente.';
