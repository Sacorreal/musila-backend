import { RegistrationFileDocumentType } from '../entities/registration-file-document-type.enum';

/** Carpeta dentro del ZIP del expediente para cada tipo documental (sección "Generación del Expediente" del requerimiento). */
export const REGISTRATION_FILE_DOCUMENT_FOLDER: Record<RegistrationFileDocumentType, string> = {
  [RegistrationFileDocumentType.AUDIO_MP3]: '03-fonograma',
  [RegistrationFileDocumentType.AUDIO_WAV]: '03-fonograma',
  [RegistrationFileDocumentType.CONTRATO_EDITORIAL]: '04-editorial',
  [RegistrationFileDocumentType.AUTORIZACION]: '05-obra-derivada',
  [RegistrationFileDocumentType.CONTRATO_ENCARGO]: '06-obra-por-encargo',
  [RegistrationFileDocumentType.LETRA]: '07-documentos',
  [RegistrationFileDocumentType.PARTITURA]: '07-documentos',
  [RegistrationFileDocumentType.CARATULA]: '07-documentos',
  [RegistrationFileDocumentType.CERTIFICADO_PI]: '07-documentos',
  [RegistrationFileDocumentType.REGISTRO_DNDA]: '07-documentos',
  [RegistrationFileDocumentType.DECLARACION_SAYCO]: '07-documentos',
  [RegistrationFileDocumentType.LICENCIA]: '07-documentos',
  [RegistrationFileDocumentType.OTRO]: '07-documentos',
};
