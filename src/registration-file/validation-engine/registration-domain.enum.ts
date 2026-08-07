export enum RegistrationDomain {
  GENERAL_INFO = 'general_info',
  PARTICIPANTS = 'participants',
  PHONOGRAM = 'phonogram',
  PUBLISHING = 'publishing',
  DERIVATIVE_WORK = 'derivative_work',
  COMMISSIONED_WORK = 'commissioned_work',
  AI = 'ai',
  DOCUMENTS = 'documents',
}

export const ALL_REGISTRATION_DOMAINS: RegistrationDomain[] = [
  RegistrationDomain.GENERAL_INFO,
  RegistrationDomain.PARTICIPANTS,
  RegistrationDomain.PHONOGRAM,
  RegistrationDomain.PUBLISHING,
  RegistrationDomain.DERIVATIVE_WORK,
  RegistrationDomain.COMMISSIONED_WORK,
  RegistrationDomain.AI,
  RegistrationDomain.DOCUMENTS,
];

export const REGISTRATION_DOMAIN_LABELS: Record<RegistrationDomain, string> = {
  [RegistrationDomain.GENERAL_INFO]: 'Información General',
  [RegistrationDomain.PARTICIPANTS]: 'Participantes',
  [RegistrationDomain.PHONOGRAM]: 'Fonograma',
  [RegistrationDomain.PUBLISHING]: 'Editorial',
  [RegistrationDomain.DERIVATIVE_WORK]: 'Obra Derivada',
  [RegistrationDomain.COMMISSIONED_WORK]: 'Obra por Encargo',
  [RegistrationDomain.AI]: 'Inteligencia Artificial',
  [RegistrationDomain.DOCUMENTS]: 'Documentos',
};
