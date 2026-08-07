import { ValidationEngine } from './validation-engine';
import { RegistrationFileSnapshot } from './validation-engine.types';
import { RegistrationDomain } from './registration-domain.enum';
import { RegistrationFileStatus } from '../entities/registration-file-status.enum';
import { RegistrationFileDocumentType } from '../entities/registration-file-document-type.enum';
import { RegistrationFileParticipantRole } from '../entities/registration-file-participant-role.enum';
import { SaycoRegistrationProfile } from '../profiles/sayco/sayco-registration-profile';
import { DndaRegistrationProfile } from '../profiles/dnda/dnda-registration-profile';

function buildSnapshot(overrides: Partial<RegistrationFileSnapshot> = {}): RegistrationFileSnapshot {
  return {
    generalInfo: {
      title: 'Mi Canción',
      alternativeTitles: [],
      language: 'Español',
      genre: 'Vallenato',
      ritmo: 'Paseo',
      durationSeconds: 210,
      creationDate: '2025-01-15',
      creationPlace: 'Bogotá',
      workState: null,
      version: null,
      description: null,
    },
    participants: [
      {
        role: RegistrationFileParticipantRole.COMPOSITOR,
        authorialPercentage: 100,
        mechanicalPercentage: 100,
        managementSociety: 'SAYCO',
        saycoCode: '12345',
      },
    ],
    hasPublishingDeal: false,
    hasPublishingContract: false,
    phonogram: null,
    derivativeWork: null,
    commissionedWork: null,
    aiUsage: { usedAi: false, toolUsed: null, participationLevel: null, observations: null },
    documentTypesPresent: [RegistrationFileDocumentType.LETRA, RegistrationFileDocumentType.CARATULA, RegistrationFileDocumentType.PARTITURA],
    trackAudioDurationSeconds: null,
    ...overrides,
  };
}

describe('ValidationEngine — perfil SAYCO', () => {
  const engine = new ValidationEngine([new SaycoRegistrationProfile()]);

  it('marca LISTO_PARA_PRESENTAR con 100% y sin errores/advertencias', () => {
    const result = engine.run(buildSnapshot());

    expect(result.overallPercentage).toBe(100);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.status).toBe(RegistrationFileStatus.LISTO_PARA_PRESENTAR);
  });

  it('reporta error cuando la suma de %PER o %MEC no es 100', () => {
    const snapshot = buildSnapshot({
      participants: [
        {
          role: RegistrationFileParticipantRole.COMPOSITOR,
          authorialPercentage: 60,
          mechanicalPercentage: 100,
          managementSociety: 'SAYCO',
          saycoCode: null,
        },
      ],
    });

    const result = engine.run(snapshot);

    expect(result.errors.some((issue) => issue.code === 'SAYCO_PARTICIPANTS_PER_SUM')).toBe(true);
    expect(result.status).toBe(RegistrationFileStatus.INCOMPLETO);
  });

  it('excluye del promedio un dominio no aplicable ("No aplica")', () => {
    const result = engine.run(buildSnapshot({ hasPublishingDeal: false }));

    const publishingDomain = result.domains.find((d) => d.domain === RegistrationDomain.PUBLISHING);
    expect(publishingDomain?.applicable).toBe(false);
    expect(result.overallPercentage).toBe(100);
  });

  it('exige contrato y documentos cuando hasPublishingDeal es true', () => {
    const result = engine.run(buildSnapshot({ hasPublishingDeal: true, hasPublishingContract: false }));

    const publishingDomain = result.domains.find((d) => d.domain === RegistrationDomain.PUBLISHING);
    expect(publishingDomain?.applicable).toBe(true);
    expect(result.errors.some((issue) => issue.code === 'SAYCO_PUBLISHING_CONTRACT_MISSING')).toBe(true);
    expect(result.errors.some((issue) => issue.code === 'SAYCO_PUBLISHING_DOC_CONTRACT_MISSING')).toBe(true);
  });

  it('genera advertencia (no error) cuando la duración declarada difiere de la real', () => {
    const result = engine.run(buildSnapshot({ trackAudioDurationSeconds: 250 }));

    expect(result.errors).toHaveLength(0);
    expect(result.warnings.some((issue) => issue.code === 'SAYCO_DURATION_MISMATCH')).toBe(true);
    expect(result.status).toBe(RegistrationFileStatus.VALIDADO_PARCIALMENTE);
  });

  it('marca EN_CONSTRUCCION cuando el expediente está vacío', () => {
    const result = engine.run(
      buildSnapshot({
        generalInfo: {
          title: '',
          alternativeTitles: [],
          language: '',
          genre: '',
          ritmo: null,
          durationSeconds: null,
          creationDate: null,
          creationPlace: null,
          workState: null,
          version: null,
          description: null,
        },
        participants: [],
        aiUsage: null,
        documentTypesPresent: [],
      }),
    );

    expect(result.overallPercentage).toBe(0);
    expect(result.status).toBe(RegistrationFileStatus.EN_CONSTRUCCION);
  });
});

describe('ValidationEngine — perfil DNDA (alcance MVP)', () => {
  const engine = new ValidationEngine([new DndaRegistrationProfile()]);

  it('no evalúa Fonograma/Editorial/IA — quedan como "No aplica"', () => {
    const result = engine.run(buildSnapshot());

    const nonApplicable = [RegistrationDomain.PHONOGRAM, RegistrationDomain.PUBLISHING, RegistrationDomain.AI];
    for (const domain of nonApplicable) {
      expect(result.domains.find((d) => d.domain === domain)?.applicable).toBe(false);
    }
  });

  it('exige letra y partitura como documento combinado', () => {
    const result = engine.run(buildSnapshot({ documentTypesPresent: [RegistrationFileDocumentType.LETRA] }));

    expect(result.errors.some((issue) => issue.code === 'DNDA_DOC_PARTITURA_MISSING')).toBe(true);
  });
});

describe('ValidationEngine — múltiples perfiles activos (SAYCO + DNDA)', () => {
  it('un dominio es aplicable si al menos un perfil activo lo requiere', () => {
    const engine = new ValidationEngine([new SaycoRegistrationProfile(), new DndaRegistrationProfile()]);
    const result = engine.run(buildSnapshot());

    // PHONOGRAM no aplica para ninguno de los dos con hasRecording=false/null
    expect(result.domains.find((d) => d.domain === RegistrationDomain.PHONOGRAM)?.applicable).toBe(false);
    // PARTICIPANTS es aplicable para ambos
    expect(result.domains.find((d) => d.domain === RegistrationDomain.PARTICIPANTS)?.applicable).toBe(true);
  });
});
