import { RecordingType } from './recording-type.enum';
import { OriginalWorkOrigin } from './original-work-origin.enum';

/** Dominio 3 (Fonograma) — jsonb embebido en `RegistrationFile.phonogramData`. */
export interface PhonogramData {
  hasRecording: boolean;
  recordingType: RecordingType | null;
  isrc: string | null;
  upc: string | null;
  mainArtistName: string | null;
  albumOrEpName: string | null;
  releaseDate: string | null;
  phonogramProducer: string | null;
  phonogramOwner: string | null;
  recordingDate: string | null;
}

/** Dominio 5 (Obra Derivada) — jsonb embebido en `RegistrationFile.derivativeWorkData`. */
export interface DerivativeWorkData {
  isDerivative: boolean;
  originalWorkOrigin: OriginalWorkOrigin | null;
  iswc: string | null;
  preexistingWorkName: string | null;
  adaptationType: string | null;
}

/** Dominio 6 (Obra por Encargo) — jsonb embebido en `RegistrationFile.commissionedWorkData`. */
export interface CommissionedWorkData {
  isCommissioned: boolean;
  contractingCompany: string | null;
  observations: string | null;
}

/** Dominio 7 (Inteligencia Artificial) — jsonb embebido en `RegistrationFile.aiUsageData`. */
export interface AiUsageData {
  usedAi: boolean;
  toolUsed: string | null;
  participationLevel: string | null;
  observations: string | null;
}
