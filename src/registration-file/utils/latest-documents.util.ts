import { RegistrationFileDocument } from '../entities/registration-file-document.entity';

/**
 * Cada re-subida crea una fila nueva con `version` incrementada (no se
 * sobreescribe, ver `RegistrationFileDocument`), así que "¿está presente el
 * tipo X?" siempre debe mirar solo la versión vigente por tipo documental,
 * no todo el historial.
 */
export function pickLatestDocumentPerType(documents: RegistrationFileDocument[]): RegistrationFileDocument[] {
  const latestByType = new Map<string, RegistrationFileDocument>();

  for (const document of documents) {
    const current = latestByType.get(document.documentType);
    if (!current || document.version > current.version) {
      latestByType.set(document.documentType, document);
    }
  }

  return Array.from(latestByType.values());
}
