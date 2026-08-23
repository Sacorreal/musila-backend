import { Injectable } from '@nestjs/common';
import { CertificateStatus } from 'src/certificates/entities/certificate-status.enum';
import { RegistrationFileProfileSubmissionStatus } from 'src/registration-file/entities/registration-file-profile-submission-status.enum';
import { SplitAuthorStatus } from 'src/splits/entities/split-author-status.enum';
import {
  HealthScoreCategoryDto,
  HealthScoreFieldDto,
  HealthScoreIntellectualPropertyDto,
  TrackHealthScoreDto,
} from './dto/track-health-score-response.dto';
import { TrackHealthBundle } from './types/health-score-bundle.type';

const round = (value: number): number => Math.round(value * 100) / 100;

/**
 * Calculador puro del Health Score (Editorial Command Center): dado un
 * `TrackHealthBundle` ya resuelto desde la base de datos, evalúa las 4
 * categorías del spec sin hacer ninguna consulta propia — así el mismo
 * cálculo se reutiliza tanto en la vista de publisher como en la del autor.
 */
@Injectable()
export class HealthScoreCalculatorService {
  calculate(bundle: TrackHealthBundle): TrackHealthScoreDto {
    const documentary = this.calculateDocumentary(bundle);
    const legal = this.calculateLegal(bundle);
    const intellectualProperty = this.calculateIntellectualProperty(bundle);
    const commercial = this.calculateCommercial(bundle);

    const overallScore = round(
      (documentary.score + legal.score + intellectualProperty.score + commercial.score) / 4,
    );

    return {
      trackId: bundle.track.id,
      title: bundle.track.title,
      overallScore,
      documentary,
      legal,
      intellectualProperty,
      commercial,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Estado Documental (Feature 3)
  // ─────────────────────────────────────────────────────────────────────────

  private calculateDocumentary(bundle: TrackHealthBundle): HealthScoreCategoryDto {
    const { track, registrationFile } = bundle;

    return this.buildCategory([
      { key: 'title', label: 'Título', completed: !!track.title },
      { key: 'alternativeTitles', label: 'Títulos alternativos', completed: !!track.alternativeTitles?.length },
      { key: 'genre', label: 'Género', completed: !!track.genre?.genre },
      { key: 'ritmo', label: 'Ritmo', completed: !!track.ritmo },
      { key: 'duration', label: 'Duración', completed: !!registrationFile?.durationSeconds },
      { key: 'iswc', label: 'ISWC', completed: !!track.iswc },
    ]);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Estado Legal (Feature 4)
  // ─────────────────────────────────────────────────────────────────────────

  private calculateLegal(bundle: TrackHealthBundle): HealthScoreCategoryDto {
    const { certificate, registrationFile, intellectualProperties } = bundle;

    const isRegistered = (profileKey: string): boolean =>
      registrationFile?.profileStatuses?.some(
        (status) =>
          status.profileKey === profileKey && status.status === RegistrationFileProfileSubmissionStatus.REGISTRADO,
      ) ?? false;

    const hasIpDocument = (type: string, key?: string): boolean =>
      intellectualProperties.some((ip) => ip.type === type && (!key || ip.key === key) && !!ip.documentUrl);

    const musilaCertificate = certificate?.status === CertificateStatus.ISSUED;
    const dnda = isRegistered('DNDA') || hasIpDocument('copyrightOffice');

    // Cualquier perfil activo distinto de DNDA se trata como Sociedad de
    // Gestión Colectiva (SAYCO u otras), sin hardcodear un solo país.
    const cmoKeys = (registrationFile?.activeProfileKeys ?? []).filter((key) => key !== 'DNDA');
    const sgc = cmoKeys.some((key) => isRegistered(key)) || hasIpDocument('cmo');

    return this.buildCategory([
      { key: 'musilaCertificate', label: 'Certificado Musila', completed: musilaCertificate },
      { key: 'dnda', label: 'Registro DNDA', completed: dnda },
      { key: 'sgc', label: 'Certificado Sociedad de Gestión Colectiva', completed: sgc },
    ]);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Estado de Propiedad Intelectual (Features 5-6)
  // ─────────────────────────────────────────────────────────────────────────

  private calculateIntellectualProperty(bundle: TrackHealthBundle): HealthScoreIntellectualPropertyDto {
    const splitAuthoral = this.calculateSplitAuthoral(bundle);
    const splitEditorial = this.calculateSplitEditorial(bundle);

    const score = splitEditorial.applicable
      ? round((splitAuthoral.score + (splitEditorial.score ?? 0)) / 2)
      : splitAuthoral.score;

    return { score, splitAuthoral, splitEditorial };
  }

  /** Proporción de coautores que ya firmaron su participación sobre el total. */
  private calculateSplitAuthoral(bundle: TrackHealthBundle): { score: number; signedCount: number; totalCoauthors: number } {
    const { split, track } = bundle;

    const totalCoauthors = split?.authors?.length ?? track.authors?.length ?? 0;
    const signedCount = split?.authors?.filter((author) => author.status === SplitAuthorStatus.APPROVED).length ?? 0;

    return {
      score: totalCoauthors > 0 ? round((signedCount / totalCoauthors) * 100) : 0,
      signedCount,
      totalCoauthors,
    };
  }

  /**
   * "Tiene editora" = existe un `PublisherShare` habilitado para el autor
   * principal de la obra (relación editora-autor, Flow 2). Completo solo si,
   * además de nombre/IPI/porcentaje válidos, la relación fue **confirmada**
   * a través del flujo de incorporación al roster (`confirmedAt` no nulo) —
   * un share activado por bulk-edit suelto en `/settings/publisher-share`
   * sin pasar por esa confirmación no cuenta como completo.
   */
  private calculateSplitEditorial(
    bundle: TrackHealthBundle,
  ): { applicable: boolean; score: number | null; missingFields: string[] } {
    const publisherShare = bundle.publisherShares[0];

    if (!publisherShare) {
      return { applicable: false, score: null, missingFields: [] };
    }

    const missingFields: string[] = [];
    if (!publisherShare.organizationName) missingFields.push('Nombre de la editorial');
    if (!publisherShare.organizationIpiNumber) missingFields.push('Número IPI de la editorial');
    if (!(publisherShare.percentage > 0 && publisherShare.percentage <= 100)) {
      missingFields.push('Porcentaje editorial');
    }
    if (!publisherShare.confirmedAt) missingFields.push('Confirmación de la editorial');

    return { applicable: true, score: missingFields.length === 0 ? 100 : 0, missingFields };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Estado Comercial (Feature 7)
  // ─────────────────────────────────────────────────────────────────────────

  private calculateCommercial(bundle: TrackHealthBundle): HealthScoreCategoryDto {
    const { registrationFile } = bundle;

    if (!registrationFile?.phonogramData) {
      return {
        score: 0,
        fields: [],
        missingFields: ['Expediente de registro (metadata del master)'],
        warning: 'No hay expediente de registro con metadata del master para esta obra.',
      };
    }

    const { phonogramData } = registrationFile;

    return this.buildCategory([
      { key: 'isrc', label: 'ISRC', completed: !!phonogramData.isrc },
      { key: 'upc', label: 'UPC', completed: !!phonogramData.upc },
      { key: 'mainArtistName', label: 'Nombre del artista principal', completed: !!phonogramData.mainArtistName },
      { key: 'albumOrEpName', label: 'Nombre del álbum o EP', completed: !!phonogramData.albumOrEpName },
      { key: 'releaseDate', label: 'Fecha de lanzamiento', completed: !!phonogramData.releaseDate },
    ]);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private buildCategory(fields: HealthScoreFieldDto[]): HealthScoreCategoryDto {
    const completedCount = fields.filter((field) => field.completed).length;
    const score = fields.length > 0 ? round((completedCount / fields.length) * 100) : 0;

    return {
      score,
      fields,
      missingFields: fields.filter((field) => !field.completed).map((field) => field.label),
    };
  }
}
