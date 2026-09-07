import { HealthScoreCalculatorService } from './health-score-calculator.service';
import { CertificateStatus } from 'src/certificates/entities/certificate-status.enum';
import { RegistrationFileProfileSubmissionStatus } from 'src/registration-file/entities/registration-file-profile-submission-status.enum';
import { SplitAuthorStatus } from 'src/splits/entities/split-author-status.enum';
import { TrackHealthBundle } from './types/health-score-bundle.type';

describe('HealthScoreCalculatorService', () => {
  const service = new HealthScoreCalculatorService();

  const baseTrack = {
    id: 'track-1',
    title: 'Amanecer',
    alternativeTitles: undefined,
    genre: { genre: 'Salsa' },
    ritmo: undefined,
    iswc: undefined,
    authors: [{ id: 'author-1' }],
  } as any;

  const emptyBundle = (): TrackHealthBundle => ({
    track: baseTrack,
    registrationFile: null,
    certificate: null,
    intellectualProperties: [],
    split: null,
    publisherShares: [],
  });

  describe('Estado Documental', () => {
    it('marca 100% cuando todos los campos están presentes', () => {
      const bundle = emptyBundle();
      bundle.track = {
        ...baseTrack,
        alternativeTitles: ['Sunrise'],
        ritmo: 'Salsa dura',
        iswc: 'T-034524680-1',
      };
      bundle.registrationFile = { durationSeconds: 210, activeProfileKeys: [], profileStatuses: [] } as any;

      const result = service.calculate(bundle);

      expect(result.documentary.score).toBe(100);
      expect(result.documentary.missingFields).toEqual([]);
    });

    it('calcula el porcentaje proporcional cuando faltan campos', () => {
      const result = service.calculate(emptyBundle());

      // title + genre completos de 6 campos = 33.33%
      expect(result.documentary.score).toBeCloseTo(33.33, 1);
      expect(result.documentary.missingFields).toEqual(
        expect.arrayContaining(['Títulos alternativos', 'Ritmo', 'Duración', 'ISWC']),
      );
    });
  });

  describe('Estado Legal', () => {
    it('marca completo vía RegistrationFile cuando DNDA y la CMO están REGISTRADO', () => {
      const bundle = emptyBundle();
      bundle.certificate = { status: CertificateStatus.ISSUED } as any;
      bundle.registrationFile = {
        activeProfileKeys: ['DNDA', 'SAYCO'],
        profileStatuses: [
          { profileKey: 'DNDA', status: RegistrationFileProfileSubmissionStatus.REGISTRADO },
          { profileKey: 'SAYCO', status: RegistrationFileProfileSubmissionStatus.REGISTRADO },
        ],
      } as any;

      const result = service.calculate(bundle);

      expect(result.legal.score).toBe(100);
    });

    it('marca completo vía IntellectualProperty (documento subido) como alternativa OR', () => {
      const bundle = emptyBundle();
      bundle.intellectualProperties = [
        { type: 'copyrightOffice', documentUrl: 'https://docs/dnda.pdf' },
        { type: 'cmo', key: 'SAYCO', documentUrl: 'https://docs/sayco.pdf' },
      ] as any;

      const result = service.calculate(bundle);

      expect(result.legal.fields.find((f) => f.key === 'dnda')?.completed).toBe(true);
      expect(result.legal.fields.find((f) => f.key === 'sgc')?.completed).toBe(true);
      expect(result.legal.fields.find((f) => f.key === 'musilaCertificate')?.completed).toBe(false);
    });

    it('marca 0% cuando no hay ningún dato legal', () => {
      const result = service.calculate(emptyBundle());
      expect(result.legal.score).toBe(0);
    });
  });

  describe('Estado Comercial', () => {
    it('marca 0% con advertencia cuando no hay expediente de registro', () => {
      const result = service.calculate(emptyBundle());
      expect(result.commercial.score).toBe(0);
      expect(result.commercial.warning).toBeDefined();
    });

    it('calcula el porcentaje de campos del fonograma presentes', () => {
      const bundle = emptyBundle();
      bundle.registrationFile = {
        durationSeconds: 200,
        activeProfileKeys: [],
        profileStatuses: [],
        phonogramData: {
          isrc: 'USRC17607839',
          upc: null,
          mainArtistName: 'Grupo X',
          albumOrEpName: null,
          releaseDate: null,
        },
      } as any;

      const result = service.calculate(bundle);

      expect(result.commercial.score).toBeCloseTo(40, 1); // 2 de 5
      expect(result.commercial.warning).toBeUndefined();
    });
  });

  describe('Estado de Propiedad Intelectual', () => {
    it('Split Autoral: proporción de firmantes sobre el total de coautores', () => {
      const bundle = emptyBundle();
      bundle.split = {
        authors: [
          { status: SplitAuthorStatus.APPROVED },
          { status: SplitAuthorStatus.PENDING },
        ],
      } as any;

      const result = service.calculate(bundle);

      expect(result.intellectualProperty.splitAuthoral).toEqual({ score: 50, signedCount: 1, totalCoauthors: 2 });
    });

    it('autor único con split completado da 100% en el subcomponente autoral', () => {
      const bundle = emptyBundle();
      bundle.split = { authors: [{ status: SplitAuthorStatus.APPROVED }] } as any;

      const result = service.calculate(bundle);

      expect(result.intellectualProperty.splitAuthoral.score).toBe(100);
    });

    it('Split Editorial no aplica cuando el autor no tiene editora (se excluye del promedio)', () => {
      const bundle = emptyBundle();
      bundle.split = { authors: [{ status: SplitAuthorStatus.APPROVED }] } as any;
      bundle.publisherShares = [];

      const result = service.calculate(bundle);

      expect(result.intellectualProperty.splitEditorial).toEqual({ applicable: false, score: null, missingFields: [] });
      // Solo cuenta el subcomponente autoral (100%), no se promedia con nada más.
      expect(result.intellectualProperty.score).toBe(100);
    });

    it('Split Editorial completo se promedia con el autoral', () => {
      const bundle = emptyBundle();
      bundle.split = {
        authors: [{ status: SplitAuthorStatus.APPROVED }, { status: SplitAuthorStatus.PENDING }],
      } as any; // autoral = 50%
      bundle.publisherShares = [
        {
          organizationId: 'org-1',
          organizationName: 'Sony',
          organizationIpiNumber: '00000000199',
          percentage: 20,
          contractUrl: null,
          confirmedAt: new Date('2026-08-01'),
        },
      ];

      const result = service.calculate(bundle);

      expect(result.intellectualProperty.splitEditorial).toEqual({ applicable: true, score: 100, missingFields: [] });
      expect(result.intellectualProperty.score).toBe(75); // (50 + 100) / 2
    });

    it('Split Editorial incompleto (sin IPI) da 0% y se refleja en missingFields', () => {
      const bundle = emptyBundle();
      bundle.split = { authors: [{ status: SplitAuthorStatus.APPROVED }] } as any; // autoral = 100%
      bundle.publisherShares = [
        {
          organizationId: 'org-1',
          organizationName: 'Sony',
          organizationIpiNumber: null,
          percentage: 20,
          contractUrl: null,
          confirmedAt: new Date('2026-08-01'),
        },
      ];

      const result = service.calculate(bundle);

      expect(result.intellectualProperty.splitEditorial.score).toBe(0);
      expect(result.intellectualProperty.splitEditorial.missingFields).toContain('Número IPI de la editorial');
      expect(result.intellectualProperty.score).toBe(50); // (100 + 0) / 2
    });

    it('Split Editorial con nombre/IPI/% válidos pero sin confirmar (bulk-edit suelto) no cuenta como completo', () => {
      const bundle = emptyBundle();
      bundle.split = { authors: [{ status: SplitAuthorStatus.APPROVED }] } as any; // autoral = 100%
      bundle.publisherShares = [
        {
          organizationId: 'org-1',
          organizationName: 'Sony',
          organizationIpiNumber: '00000000199',
          percentage: 20,
          contractUrl: null,
          confirmedAt: null,
        },
      ];

      const result = service.calculate(bundle);

      expect(result.intellectualProperty.splitEditorial.score).toBe(0);
      expect(result.intellectualProperty.splitEditorial.missingFields).toEqual(['Confirmación de la editorial']);
    });
  });

  it('overallScore es el promedio simple de las 4 categorías', () => {
    const bundle = emptyBundle();
    bundle.certificate = { status: CertificateStatus.ISSUED } as any; // legal: 1/3 = 33.33

    const result = service.calculate(bundle);
    const expected =
      (result.documentary.score + result.legal.score + result.intellectualProperty.score + result.commercial.score) /
      4;

    expect(result.overallScore).toBeCloseTo(expected, 1);
  });
});
