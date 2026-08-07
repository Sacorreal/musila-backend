import { Injectable } from '@nestjs/common';
import { RegistrationDomain } from '../../validation-engine/registration-domain.enum';
import { RegistrationRule } from '../../validation-engine/registration-rule.interface';
import { RegistrationProfile } from '../../validation-engine/registration-profile.interface';
import { RegistrationFileSnapshot, ValidationIssue } from '../../validation-engine/validation-engine.types';
import { buildIssue } from '../../validation-engine/issue.util';
import { boolAsFilled, isFilled, percentageFilled } from '../../validation-engine/completeness.util';
import { RegistrationFileDocumentType as DocType } from '../../entities/registration-file-document-type.enum';
import { OriginalWorkOrigin } from '../../entities/original-work-origin.enum';

const D = RegistrationDomain;

const generalInfoRequiredRule: RegistrationRule = {
  code: 'DNDA_GENERAL_INFO_REQUIRED',
  domain: D.GENERAL_INFO,
  evaluate(snapshot) {
    const { title, creationDate, genre, ritmo } = snapshot.generalInfo;
    const issues: ValidationIssue[] = [];
    if (!isFilled(title)) issues.push(buildIssue(D.GENERAL_INFO, 'DNDA_TITLE_MISSING', 'error', 'Falta el título de la obra', 'title'));
    if (!isFilled(creationDate)) issues.push(buildIssue(D.GENERAL_INFO, 'DNDA_CREATION_DATE_MISSING', 'error', 'Falta el año de creación de la obra', 'creationDate'));
    if (!isFilled(genre) && !isFilled(ritmo)) {
      issues.push(buildIssue(D.GENERAL_INFO, 'DNDA_GENRE_RITMO_MISSING', 'error', 'Indica al menos el género o el ritmo de la obra', 'genre'));
    }
    return issues;
  },
};

const participantsRequiredRule: RegistrationRule = {
  code: 'DNDA_PARTICIPANTS_REQUIRED',
  domain: D.PARTICIPANTS,
  evaluate(snapshot) {
    if (snapshot.participants.length > 0) return [];
    return [buildIssue(D.PARTICIPANTS, 'DNDA_PARTICIPANTS_EMPTY', 'error', 'Agrega al menos un autor o compositor de la obra')];
  },
};

const derivativeWorkRule: RegistrationRule = {
  code: 'DNDA_DERIVATIVE_WORK',
  domain: D.DERIVATIVE_WORK,
  evaluate(snapshot) {
    if (!snapshot.derivativeWork?.isDerivative) return [];
    const issues: ValidationIssue[] = [];
    if (!isFilled(snapshot.derivativeWork.iswc)) issues.push(buildIssue(D.DERIVATIVE_WORK, 'DNDA_DERIVATIVE_ISWC_MISSING', 'error', 'Falta el ISWC de la obra preexistente', 'iswc'));
    if (!isFilled(snapshot.derivativeWork.preexistingWorkName)) {
      issues.push(buildIssue(D.DERIVATIVE_WORK, 'DNDA_DERIVATIVE_NAME_MISSING', 'error', 'Falta el nombre de la obra preexistente', 'preexistingWorkName'));
    }
    if (snapshot.derivativeWork.originalWorkOrigin === OriginalWorkOrigin.PRIVADA && !snapshot.documentTypesPresent.includes(DocType.AUTORIZACION)) {
      issues.push(buildIssue(D.DERIVATIVE_WORK, 'DNDA_DERIVATIVE_AUTHORIZATION_MISSING', 'error', 'Falta la autorización del autor original'));
    }
    return issues;
  },
};

const commissionedWorkRule: RegistrationRule = {
  code: 'DNDA_COMMISSIONED_WORK',
  domain: D.COMMISSIONED_WORK,
  evaluate(snapshot) {
    if (!snapshot.commissionedWork?.isCommissioned) return [];
    const issues: ValidationIssue[] = [];
    if (!isFilled(snapshot.commissionedWork.contractingCompany)) {
      issues.push(buildIssue(D.COMMISSIONED_WORK, 'DNDA_COMMISSIONED_COMPANY_MISSING', 'error', 'Falta la compañía contratante', 'contractingCompany'));
    }
    if (!snapshot.documentTypesPresent.includes(DocType.CONTRATO_ENCARGO)) {
      issues.push(buildIssue(D.COMMISSIONED_WORK, 'DNDA_COMMISSIONED_DOC_CONTRACT_MISSING', 'error', 'Falta el documento del contrato por encargo'));
    }
    return issues;
  },
};

/**
 * DNDA exige letra y partitura como un único documento combinado (a
 * diferencia de SAYCO, que los pide por separado). El modelo de documentos
 * no distingue "combinado" de "separado" — se aproxima exigiendo ambos tipos
 * presentes; el `ManualRegistrationProvider` (Fase 6) es responsable de
 * mergearlos en un solo PDF al preparar el paquete para DNDA.
 */
const combinedLyricsAndScoreRule: RegistrationRule = {
  code: 'DNDA_COMBINED_DOCUMENT',
  domain: D.DOCUMENTS,
  evaluate(snapshot) {
    const issues: ValidationIssue[] = [];
    if (!snapshot.documentTypesPresent.includes(DocType.LETRA)) {
      issues.push(buildIssue(D.DOCUMENTS, 'DNDA_DOC_LETRA_MISSING', 'error', 'Falta cargar la letra de la obra'));
    }
    if (!snapshot.documentTypesPresent.includes(DocType.PARTITURA)) {
      issues.push(buildIssue(D.DOCUMENTS, 'DNDA_DOC_PARTITURA_MISSING', 'error', 'Falta cargar la partitura (guion melódico de la voz)'));
    }
    return issues;
  },
};

const RULES: RegistrationRule[] = [
  generalInfoRequiredRule,
  participantsRequiredRule,
  derivativeWorkRule,
  commissionedWorkRule,
  combinedLyricsAndScoreRule,
];

/**
 * Perfil de registro DNDA — alcance MVP acordado explícitamente: cubre solo
 * los campos ya modelados por los 8 dominios del expediente (título, año,
 * género/ritmo, participantes, obra derivada/por encargo, letra+partitura).
 * NO cubre "calidad del solicitante" ni "carácter de la obra" (identificación
 * del autor: anónima/póstuma/seudónima/nominada) — la página oficial de la
 * DNDA consultada no expone un formulario PDF descargable equivalente al
 * PMDO-FO04 de SAYCO para verificar esos campos con certeza; quedan
 * pendientes para una iteración posterior. Por eso Fonograma, Editorial e IA
 * no son dominios aplicables bajo este perfil.
 */
@Injectable()
export class DndaRegistrationProfile implements RegistrationProfile {
  readonly key = 'DNDA' as const;
  readonly label = 'DNDA';

  getRules(): RegistrationRule[] {
    return RULES;
  }

  isDomainApplicable(domain: RegistrationDomain, snapshot: RegistrationFileSnapshot): boolean {
    switch (domain) {
      case D.PHONOGRAM:
      case D.PUBLISHING:
      case D.AI:
        return false;
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
          snapshot.generalInfo.creationDate,
          boolAsFilled(isFilled(snapshot.generalInfo.genre) || isFilled(snapshot.generalInfo.ritmo)),
        ]);
      case D.PARTICIPANTS:
        return snapshot.participants.length > 0 ? 100 : 0;
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
        ]);
      case D.DOCUMENTS:
        return percentageFilled([
          boolAsFilled(snapshot.documentTypesPresent.includes(DocType.LETRA)),
          boolAsFilled(snapshot.documentTypesPresent.includes(DocType.PARTITURA)),
        ]);
      default:
        return 100;
    }
  }

  getRequiredDocumentTypes(snapshot: RegistrationFileSnapshot): string[] {
    const required = new Set<string>([DocType.LETRA, DocType.PARTITURA]);
    if (snapshot.commissionedWork?.isCommissioned) required.add(DocType.CONTRATO_ENCARGO);
    if (snapshot.derivativeWork?.isDerivative && snapshot.derivativeWork.originalWorkOrigin === OriginalWorkOrigin.PRIVADA) {
      required.add(DocType.AUTORIZACION);
    }
    return Array.from(required);
  }
}
