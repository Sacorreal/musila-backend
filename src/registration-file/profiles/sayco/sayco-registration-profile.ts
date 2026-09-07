import { Injectable } from '@nestjs/common';
import { RegistrationDomain } from '../../validation-engine/registration-domain.enum';
import { RegistrationRule } from '../../validation-engine/registration-rule.interface';
import { RegistrationProfile } from '../../validation-engine/registration-profile.interface';
import { RegistrationFileSnapshot, ValidationIssue } from '../../validation-engine/validation-engine.types';
import { buildIssue } from '../../validation-engine/issue.util';
import { boolAsFilled, isFilled, percentageFilled, round2 } from '../../validation-engine/completeness.util';
import { RegistrationFileDocumentType as DocType } from '../../entities/registration-file-document-type.enum';
import { OriginalWorkOrigin } from '../../entities/original-work-origin.enum';

const D = RegistrationDomain;

const generalInfoRequiredRule: RegistrationRule = {
  code: 'SAYCO_GENERAL_INFO_REQUIRED',
  domain: D.GENERAL_INFO,
  evaluate(snapshot) {
    const { title, language, genre, ritmo, durationSeconds } = snapshot.generalInfo;
    const issues: ValidationIssue[] = [];
    if (!isFilled(title)) issues.push(buildIssue(D.GENERAL_INFO, 'SAYCO_TITLE_MISSING', 'error', 'Falta el título de la obra', 'title'));
    if (!isFilled(language)) issues.push(buildIssue(D.GENERAL_INFO, 'SAYCO_LANGUAGE_MISSING', 'error', 'Falta el idioma de la obra', 'language'));
    if (!isFilled(genre)) issues.push(buildIssue(D.GENERAL_INFO, 'SAYCO_GENRE_MISSING', 'error', 'Falta el género', 'genre'));
    if (!isFilled(ritmo)) issues.push(buildIssue(D.GENERAL_INFO, 'SAYCO_RITMO_MISSING', 'error', 'Falta el ritmo', 'ritmo'));
    if (!isFilled(durationSeconds)) issues.push(buildIssue(D.GENERAL_INFO, 'SAYCO_DURATION_MISSING', 'error', 'Falta la duración declarada', 'durationSeconds'));
    return issues;
  },
};

const durationConsistencyRule: RegistrationRule = {
  code: 'SAYCO_DURATION_CONSISTENCY',
  domain: D.GENERAL_INFO,
  evaluate(snapshot) {
    const declared = snapshot.generalInfo.durationSeconds;
    const real = snapshot.trackAudioDurationSeconds;
    if (declared == null || real == null || Math.abs(declared - real) <= 2) return [];
    return [
      buildIssue(
        D.GENERAL_INFO,
        'SAYCO_DURATION_MISMATCH',
        'warning',
        `La duración declarada (${declared}s) no coincide con la duración real del audio (${real}s)`,
        'durationSeconds',
      ),
    ];
  },
};

const participantsRequiredRule: RegistrationRule = {
  code: 'SAYCO_PARTICIPANTS_REQUIRED',
  domain: D.PARTICIPANTS,
  evaluate(snapshot) {
    if (snapshot.participants.length > 0) return [];
    return [buildIssue(D.PARTICIPANTS, 'SAYCO_PARTICIPANTS_EMPTY', 'error', 'Agrega al menos un participante (autor, compositor, etc.)')];
  },
};

const participantsPercentageSumRule: RegistrationRule = {
  code: 'SAYCO_PARTICIPANTS_PERCENTAGE_SUM',
  domain: D.PARTICIPANTS,
  evaluate(snapshot) {
    if (snapshot.participants.length === 0) return [];
    const authorialSum = round2(snapshot.participants.reduce((sum, p) => sum + Number(p.authorialPercentage), 0));
    const mechanicalSum = round2(snapshot.participants.reduce((sum, p) => sum + Number(p.mechanicalPercentage), 0));
    const issues: ValidationIssue[] = [];
    if (authorialSum !== 100) {
      issues.push(
        buildIssue(D.PARTICIPANTS, 'SAYCO_PARTICIPANTS_PER_SUM', 'error', `La suma de %PER debe ser 100% (actual: ${authorialSum}%)`, 'authorialPercentage'),
      );
    }
    if (mechanicalSum !== 100) {
      issues.push(
        buildIssue(D.PARTICIPANTS, 'SAYCO_PARTICIPANTS_MEC_SUM', 'error', `La suma de %MEC debe ser 100% (actual: ${mechanicalSum}%)`, 'mechanicalPercentage'),
      );
    }
    return issues;
  },
};

const publishingContractRule: RegistrationRule = {
  code: 'SAYCO_PUBLISHING_CONTRACT',
  domain: D.PUBLISHING,
  evaluate(snapshot) {
    if (!snapshot.hasPublishingDeal) return [];
    const issues: ValidationIssue[] = [];
    if (!snapshot.hasPublishingContract) {
      issues.push(buildIssue(D.PUBLISHING, 'SAYCO_PUBLISHING_CONTRACT_MISSING', 'error', 'Selecciona el contrato editorial que cubre esta obra', 'publishingContractId'));
    }
    if (!snapshot.documentTypesPresent.includes(DocType.CONTRATO_EDITORIAL)) {
      issues.push(buildIssue(D.PUBLISHING, 'SAYCO_PUBLISHING_DOC_CONTRACT_MISSING', 'error', 'Falta el documento del contrato editorial'));
    }
    if (!snapshot.documentTypesPresent.includes(DocType.REGISTRO_DNDA)) {
      issues.push(buildIssue(D.PUBLISHING, 'SAYCO_PUBLISHING_DOC_DNDA_MISSING', 'error', 'Falta el certificado de registro DNDA del contrato editorial'));
    }
    return issues;
  },
};

const commissionedWorkRule: RegistrationRule = {
  code: 'SAYCO_COMMISSIONED_WORK',
  domain: D.COMMISSIONED_WORK,
  evaluate(snapshot) {
    if (!snapshot.commissionedWork?.isCommissioned) return [];
    const issues: ValidationIssue[] = [];
    if (!isFilled(snapshot.commissionedWork.contractingCompany)) {
      issues.push(buildIssue(D.COMMISSIONED_WORK, 'SAYCO_COMMISSIONED_COMPANY_MISSING', 'error', 'Falta la compañía contratante', 'contractingCompany'));
    }
    if (!snapshot.documentTypesPresent.includes(DocType.CONTRATO_ENCARGO)) {
      issues.push(buildIssue(D.COMMISSIONED_WORK, 'SAYCO_COMMISSIONED_DOC_CONTRACT_MISSING', 'error', 'Falta el documento del contrato por encargo'));
    }
    if (!snapshot.documentTypesPresent.includes(DocType.REGISTRO_DNDA)) {
      issues.push(buildIssue(D.COMMISSIONED_WORK, 'SAYCO_COMMISSIONED_DOC_DNDA_MISSING', 'error', 'Falta el certificado de registro DNDA del contrato por encargo'));
    }
    return issues;
  },
};

const phonogramRule: RegistrationRule = {
  code: 'SAYCO_PHONOGRAM',
  domain: D.PHONOGRAM,
  evaluate(snapshot) {
    if (!snapshot.phonogram?.hasRecording) return [];
    const issues: ValidationIssue[] = [];
    if (!isFilled(snapshot.phonogram.recordingType)) issues.push(buildIssue(D.PHONOGRAM, 'SAYCO_PHONOGRAM_TYPE_MISSING', 'error', 'Selecciona el tipo de grabación', 'recordingType'));
    if (!isFilled(snapshot.phonogram.isrc)) issues.push(buildIssue(D.PHONOGRAM, 'SAYCO_PHONOGRAM_ISRC_MISSING', 'error', 'Falta el ISRC', 'isrc'));
    if (!isFilled(snapshot.phonogram.phonogramOwner)) issues.push(buildIssue(D.PHONOGRAM, 'SAYCO_PHONOGRAM_OWNER_MISSING', 'error', 'Falta el titular del fonograma', 'phonogramOwner'));
    if (!snapshot.documentTypesPresent.includes(DocType.AUDIO_MP3)) issues.push(buildIssue(D.PHONOGRAM, 'SAYCO_PHONOGRAM_MP3_MISSING', 'error', 'Falta el audio en formato MP3'));
    if (!snapshot.documentTypesPresent.includes(DocType.AUDIO_WAV)) issues.push(buildIssue(D.PHONOGRAM, 'SAYCO_PHONOGRAM_WAV_MISSING', 'error', 'Falta el audio en formato WAV'));
    return issues;
  },
};

const derivativeWorkRule: RegistrationRule = {
  code: 'SAYCO_DERIVATIVE_WORK',
  domain: D.DERIVATIVE_WORK,
  evaluate(snapshot) {
    if (!snapshot.derivativeWork?.isDerivative) return [];
    const issues: ValidationIssue[] = [];
    if (!isFilled(snapshot.derivativeWork.iswc)) issues.push(buildIssue(D.DERIVATIVE_WORK, 'SAYCO_DERIVATIVE_ISWC_MISSING', 'error', 'Falta el ISWC de la obra preexistente', 'iswc'));
    if (!isFilled(snapshot.derivativeWork.preexistingWorkName)) {
      issues.push(buildIssue(D.DERIVATIVE_WORK, 'SAYCO_DERIVATIVE_NAME_MISSING', 'error', 'Falta el nombre de la obra preexistente', 'preexistingWorkName'));
    }
    if (snapshot.derivativeWork.originalWorkOrigin === OriginalWorkOrigin.PRIVADA && !snapshot.documentTypesPresent.includes(DocType.AUTORIZACION)) {
      issues.push(buildIssue(D.DERIVATIVE_WORK, 'SAYCO_DERIVATIVE_AUTHORIZATION_MISSING', 'error', 'Falta la autorización del autor original'));
    }
    return issues;
  },
};

const documentsRule: RegistrationRule = {
  code: 'SAYCO_DOCUMENTS',
  domain: D.DOCUMENTS,
  evaluate(snapshot) {
    const issues: ValidationIssue[] = [];
    if (!snapshot.documentTypesPresent.includes(DocType.LETRA)) {
      issues.push(buildIssue(D.DOCUMENTS, 'SAYCO_DOC_LETRA_MISSING', 'error', 'Falta cargar la letra de la obra'));
    }
    if (!snapshot.documentTypesPresent.includes(DocType.CARATULA)) {
      issues.push(buildIssue(D.DOCUMENTS, 'SAYCO_DOC_CARATULA_MISSING', 'warning', 'Se recomienda cargar la carátula'));
    }
    if (!snapshot.documentTypesPresent.includes(DocType.PARTITURA)) {
      issues.push(buildIssue(D.DOCUMENTS, 'SAYCO_DOC_PARTITURA_MISSING', 'warning', 'Se recomienda cargar la partitura'));
    }
    return issues;
  },
};

const RULES: RegistrationRule[] = [
  generalInfoRequiredRule,
  durationConsistencyRule,
  participantsRequiredRule,
  participantsPercentageSumRule,
  publishingContractRule,
  commissionedWorkRule,
  phonogramRule,
  derivativeWorkRule,
  documentsRule,
];

/**
 * Perfil de registro SAYCO, basado en el Formato de Declaración de Obra
 * PMDO-FO04-V0.6. La IA (herramienta usada) es explícitamente opcional
 * incluso si `usedAi` es true — así lo indica el formulario — por eso el
 * dominio AI nunca produce errores/advertencias aquí, solo mide si se
 * respondió la pregunta base.
 */
@Injectable()
export class SaycoRegistrationProfile implements RegistrationProfile {
  readonly key = 'SAYCO' as const;
  readonly label = 'SAYCO';

  getRules(): RegistrationRule[] {
    return RULES;
  }

  isDomainApplicable(domain: RegistrationDomain, snapshot: RegistrationFileSnapshot): boolean {
    switch (domain) {
      case D.PHONOGRAM:
        return snapshot.phonogram?.hasRecording === true;
      case D.PUBLISHING:
        return snapshot.hasPublishingDeal === true;
      case D.DERIVATIVE_WORK:
        return snapshot.derivativeWork?.isDerivative === true;
      case D.COMMISSIONED_WORK:
        return snapshot.commissionedWork?.isCommissioned === true;
      default:
        return true;
    }
  }

  computeDomainCompleteness(domain: RegistrationDomain, snapshot: RegistrationFileSnapshot): number {
    switch (domain) {
      case D.GENERAL_INFO:
        return percentageFilled([
          snapshot.generalInfo.title,
          snapshot.generalInfo.language,
          snapshot.generalInfo.genre,
          snapshot.generalInfo.ritmo,
          snapshot.generalInfo.durationSeconds,
        ]);
      case D.PARTICIPANTS: {
        if (snapshot.participants.length === 0) return 0;
        const authorialSum = round2(snapshot.participants.reduce((sum, p) => sum + Number(p.authorialPercentage), 0));
        const mechanicalSum = round2(snapshot.participants.reduce((sum, p) => sum + Number(p.mechanicalPercentage), 0));
        return authorialSum === 100 && mechanicalSum === 100 ? 100 : 60;
      }
      case D.PHONOGRAM:
        return percentageFilled([
          snapshot.phonogram?.recordingType,
          snapshot.phonogram?.isrc,
          snapshot.phonogram?.phonogramOwner,
          boolAsFilled(snapshot.documentTypesPresent.includes(DocType.AUDIO_MP3)),
          boolAsFilled(snapshot.documentTypesPresent.includes(DocType.AUDIO_WAV)),
        ]);
      case D.PUBLISHING:
        return percentageFilled([
          boolAsFilled(snapshot.hasPublishingContract),
          boolAsFilled(snapshot.documentTypesPresent.includes(DocType.CONTRATO_EDITORIAL)),
          boolAsFilled(snapshot.documentTypesPresent.includes(DocType.REGISTRO_DNDA)),
        ]);
      case D.DERIVATIVE_WORK: {
        const fields: unknown[] = [snapshot.derivativeWork?.iswc, snapshot.derivativeWork?.preexistingWorkName];
        if (snapshot.derivativeWork?.originalWorkOrigin === OriginalWorkOrigin.PRIVADA) {
          fields.push(boolAsFilled(snapshot.documentTypesPresent.includes(DocType.AUTORIZACION)));
        }
        return percentageFilled(fields);
      }
      case D.COMMISSIONED_WORK:
        return percentageFilled([
          snapshot.commissionedWork?.contractingCompany,
          boolAsFilled(snapshot.documentTypesPresent.includes(DocType.CONTRATO_ENCARGO)),
          boolAsFilled(snapshot.documentTypesPresent.includes(DocType.REGISTRO_DNDA)),
        ]);
      case D.AI:
        return snapshot.aiUsage !== null ? 100 : 0;
      case D.DOCUMENTS:
        return snapshot.documentTypesPresent.includes(DocType.LETRA) ? 100 : 0;
      default:
        return 100;
    }
  }

  getRequiredDocumentTypes(snapshot: RegistrationFileSnapshot): string[] {
    const required = new Set<string>([DocType.LETRA]);
    if (snapshot.hasPublishingDeal) {
      required.add(DocType.CONTRATO_EDITORIAL);
      required.add(DocType.REGISTRO_DNDA);
    }
    if (snapshot.commissionedWork?.isCommissioned) {
      required.add(DocType.CONTRATO_ENCARGO);
      required.add(DocType.REGISTRO_DNDA);
    }
    if (snapshot.phonogram?.hasRecording) {
      required.add(DocType.AUDIO_MP3);
      required.add(DocType.AUDIO_WAV);
    }
    if (snapshot.derivativeWork?.isDerivative && snapshot.derivativeWork.originalWorkOrigin === OriginalWorkOrigin.PRIVADA) {
      required.add(DocType.AUTORIZACION);
    }
    return Array.from(required);
  }
}
