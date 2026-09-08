import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import { MembershipStatus } from '../organizations/entities/membership-status.enum';
import { CampaignVisibility } from './entities/campaign-visibility.enum';
import { CampaignStatus } from './entities/campaign-status.enum';
import { CampaignSubmissionStatus } from './entities/campaign-submission-status.enum';
import { LicenseType } from '../requested-tracks/entities/license-type.enum';
import { CampaignsService } from './campaigns.service';

const buildUser = (overrides: Partial<JwtPayload> = {}): JwtPayload => ({
  id: 'label-user-1',
  email: 'label@example.com',
  name: 'Label User',
  planType: UserPlanType.PLAN_DESCUBRIDOR,
  ...overrides,
});

const futureDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const pastDeadline = new Date(Date.now() - 1000);

const baseGenre = { id: 'genre-1', genre: 'Reggaeton', ritmo: ['Perreo', 'Romántico'] };

describe('CampaignsService', () => {
  let service: CampaignsService;
  let campaignRepo: any;
  let submissionRepo: any;
  let organizationRepo: any;
  let membershipRepo: any;
  let trackspaceRepo: any;
  let trackRepo: any;
  let userRepo: any;
  let genreRepo: any;
  let requestedTracksService: any;
  let eventBus: any;
  let dataSource: any;
  let updateExecute: jest.Mock;

  beforeEach(() => {
    campaignRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'campaign-1', ...data })),
      find: jest.fn().mockResolvedValue([]),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      findOne: jest.fn(),
      softRemove: jest.fn().mockResolvedValue(undefined),
    };
    submissionRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'submission-1', ...data })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      }),
    };
    organizationRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'org-1', isActive: true, name: 'Sony Music' }),
    };
    membershipRepo = {
      findOne: jest.fn().mockResolvedValue({ organizationId: 'org-1', userId: 'label-user-1', status: MembershipStatus.ACTIVE }),
    };
    trackspaceRepo = {
      findOne: jest.fn().mockResolvedValue({ organizationId: 'org-1', name: 'Sony Music Workspace', logoUrl: null, isDefault: true }),
      find: jest.fn().mockResolvedValue([]),
    };
    trackRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };
    userRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'composer-personal-1', name: 'Ana', lastName: 'Gómez', avatarUrl: null }),
      find: jest.fn().mockResolvedValue([]),
    };
    genreRepo = {
      find: jest.fn().mockResolvedValue([baseGenre]),
    };
    requestedTracksService = {
      createRequestedTracksService: jest.fn().mockResolvedValue({ id: 'requested-track-1' }),
    };
    eventBus = { emit: jest.fn() };
    updateExecute = jest.fn().mockResolvedValue({ affected: 1 });
    dataSource = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: updateExecute,
        }),
      }),
    };

    service = new CampaignsService(
      campaignRepo,
      submissionRepo,
      organizationRepo,
      membershipRepo,
      trackspaceRepo,
      trackRepo,
      userRepo,
      genreRepo,
      requestedTracksService,
      eventBus,
      dataSource,
    );
  });

  const validCreateDto = () => ({
    title: 'Buscamos tracks urbanos',
    genres: [{ genreId: 'genre-1' }],
    songsPerComposerLimit: 2,
    requiredSongsCount: 5,
    deadline: futureDeadline.toISOString(),
  });

  describe('create — de organización', () => {
    it('lanza NotFoundException si la organización no existe o está inactiva', async () => {
      organizationRepo.findOne.mockResolvedValue({ id: 'org-1', isActive: false });

      await expect(service.create(validCreateDto() as any, 'org-1', 'label-user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lanza ForbiddenException si el actor no es miembro activo de la organización', async () => {
      membershipRepo.findOne.mockResolvedValue(null);

      await expect(service.create(validCreateDto() as any, 'org-1', 'label-user-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('lanza BadRequestException si un ritmo pedido no pertenece al género', async () => {
      const dto = { ...validCreateDto(), genres: [{ genreId: 'genre-1', ritmos: ['Salsa'] }] };

      await expect(service.create(dto as any, 'org-1', 'label-user-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('crea la campaña, genera la descripción y un token si es privada', async () => {
      const dto = { ...validCreateDto(), visibility: CampaignVisibility.PRIVATE };

      const result = await service.create(dto as any, 'org-1', 'label-user-1');

      expect(result.description).toBe('Géneros buscados: Reggaeton');
      expect(result.privateToken).toBeTruthy();
      expect(result.authorName).toBe('Sony Music Workspace');
      expect(result.organizationId).toBe('org-1');
    });
  });

  describe('create — personal (sin organización, ej. planes 360/Descubridor)', () => {
    it('crea una campaña personal sin validar organización ni membership', async () => {
      const dto = validCreateDto();

      const result = await service.create(dto as any, undefined, 'composer-personal-1');

      expect(organizationRepo.findOne).not.toHaveBeenCalled();
      expect(membershipRepo.findOne).not.toHaveBeenCalled();
      expect(result.organizationId).toBeNull();
      expect(result.authorName).toBe('Ana Gómez');
    });
  });

  describe('submit', () => {
    const composerId = 'composer-1';
    const activeCampaign = {
      id: 'campaign-1',
      status: CampaignStatus.ACTIVE,
      deadline: futureDeadline,
      songsPerComposerLimit: 2,
      genreFilters: [{ genreId: 'genre-1', genreName: 'Reggaeton', ritmos: null }],
      organizationId: 'org-1',
      title: 'Campaña',
    };
    const matchingTrack = {
      id: 'track-1',
      title: 'Mi track',
      isAvailable: true,
      authors: [{ id: composerId }],
      genre: { id: 'genre-1' },
      ritmo: 'Perreo',
    };

    it('lanza ConflictException si la campaña no está activa', async () => {
      campaignRepo.findOne.mockResolvedValue({ ...activeCampaign, status: CampaignStatus.CLOSED });

      await expect(service.submit('campaign-1', 'track-1', composerId)).rejects.toBeInstanceOf(ConflictException);
    });

    it('lanza ConflictException si la fecha límite ya venció', async () => {
      campaignRepo.findOne.mockResolvedValue({ ...activeCampaign, deadline: pastDeadline });

      await expect(service.submit('campaign-1', 'track-1', composerId)).rejects.toBeInstanceOf(ConflictException);
    });

    it('lanza ForbiddenException si el track no pertenece al compositor', async () => {
      campaignRepo.findOne.mockResolvedValue(activeCampaign);
      trackRepo.findOne.mockResolvedValue({ ...matchingTrack, authors: [{ id: 'otro-usuario' }] });

      await expect(service.submit('campaign-1', 'track-1', composerId)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lanza BadRequestException si el track no está publicado (isAvailable=false)', async () => {
      campaignRepo.findOne.mockResolvedValue(activeCampaign);
      trackRepo.findOne.mockResolvedValue({ ...matchingTrack, isAvailable: false });

      await expect(service.submit('campaign-1', 'track-1', composerId)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza BadRequestException si el género/ritmo del track no coincide con la campaña', async () => {
      campaignRepo.findOne.mockResolvedValue(activeCampaign);
      trackRepo.findOne.mockResolvedValue({ ...matchingTrack, genre: { id: 'otro-genero' } });

      await expect(service.submit('campaign-1', 'track-1', composerId)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza ConflictException si el compositor ya alcanzó su cupo en la campaña', async () => {
      campaignRepo.findOne.mockResolvedValue(activeCampaign);
      trackRepo.findOne.mockResolvedValue(matchingTrack);
      submissionRepo.count.mockResolvedValue(2);

      await expect(service.submit('campaign-1', 'track-1', composerId)).rejects.toBeInstanceOf(ConflictException);
    });

    it('crea la postulación en PENDING cuando todo es válido', async () => {
      campaignRepo.findOne.mockResolvedValue(activeCampaign);
      trackRepo.findOne.mockResolvedValue(matchingTrack);

      const result = await service.submit('campaign-1', 'track-1', composerId);

      expect(result.status).toBe(CampaignSubmissionStatus.PENDING);
      expect(eventBus.emit).toHaveBeenCalledWith('campaign.submission.received', expect.any(Object));
    });
  });

  describe('selectSubmission', () => {
    const owningCampaign = {
      id: 'campaign-1',
      organizationId: 'org-1',
      requiredSongsCount: 1,
      title: 'Campaña',
      status: CampaignStatus.ACTIVE,
    };

    it('lanza ConflictException si la postulación no está PENDING', async () => {
      campaignRepo.findOne.mockResolvedValue(owningCampaign);
      submissionRepo.findOne.mockResolvedValue({ id: 'submission-1', status: CampaignSubmissionStatus.DISCARDED });

      await expect(
        service.selectSubmission('campaign-1', 'submission-1', 'org-1', buildUser(), LicenseType.LICENCIA_DE_PRIMER_USO),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('crea el RequestedTrack, marca SELECTED y cierra la campaña si se alcanza el cupo requerido', async () => {
      campaignRepo.findOne.mockResolvedValue(owningCampaign);
      submissionRepo.findOne.mockResolvedValue({
        id: 'submission-1',
        campaignId: 'campaign-1',
        trackId: 'track-1',
        composerId: 'composer-1',
        status: CampaignSubmissionStatus.PENDING,
        track: { title: 'Mi track' },
      });
      submissionRepo.count.mockResolvedValue(1); // ya alcanzó requiredSongsCount=1

      const result = await service.selectSubmission(
        'campaign-1',
        'submission-1',
        'org-1',
        buildUser(),
        LicenseType.LICENCIA_DE_PRIMER_USO,
      );

      expect(result.status).toBe(CampaignSubmissionStatus.SELECTED);
      expect(requestedTracksService.createRequestedTracksService).toHaveBeenCalledWith(
        { trackId: 'track-1', licenseType: LicenseType.LICENCIA_DE_PRIMER_USO },
        expect.objectContaining({ id: 'label-user-1' }),
      );
      expect(updateExecute).toHaveBeenCalled(); // cierre síncrono por cupo
    });
  });

  describe('remove', () => {
    it('lanza ConflictException si la campaña todavía está activa', async () => {
      campaignRepo.findOne.mockResolvedValue({ id: 'campaign-1', organizationId: 'org-1', status: CampaignStatus.ACTIVE });

      await expect(service.remove('campaign-1', 'org-1', 'label-user-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('permite el borrado manual (soft) cuando la campaña ya está cerrada', async () => {
      const closed = { id: 'campaign-1', organizationId: 'org-1', status: CampaignStatus.CLOSED };
      campaignRepo.findOne.mockResolvedValue(closed);

      await service.remove('campaign-1', 'org-1', 'label-user-1');

      expect(campaignRepo.softRemove).toHaveBeenCalledWith(closed);
    });
  });

  describe('getOwnedCampaign (vía discardSubmission)', () => {
    it('lanza NotFoundException si la campaña no existe', async () => {
      campaignRepo.findOne.mockResolvedValue(null);

      await expect(service.discardSubmission('campaign-x', 'submission-1', 'org-1', 'label-user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lanza ForbiddenException si la campaña pertenece a otra organización', async () => {
      campaignRepo.findOne.mockResolvedValue({ id: 'campaign-1', organizationId: 'otra-org' });

      await expect(service.discardSubmission('campaign-1', 'submission-1', 'org-1', 'label-user-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('lanza ForbiddenException si una campaña personal no pertenece al actor', async () => {
      campaignRepo.findOne.mockResolvedValue({ id: 'campaign-1', organizationId: null, createdByUserId: 'otro-usuario' });

      await expect(
        service.discardSubmission('campaign-1', 'submission-1', undefined, 'composer-personal-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('permite gestionar una campaña personal propia sin organizationId', async () => {
      campaignRepo.findOne.mockResolvedValue({
        id: 'campaign-1',
        organizationId: null,
        createdByUserId: 'composer-personal-1',
        title: 'Mi campaña',
      });
      submissionRepo.findOne.mockResolvedValue({
        id: 'submission-1',
        campaignId: 'campaign-1',
        status: CampaignSubmissionStatus.PENDING,
        composerId: 'otro-compositor',
        track: { title: 'Track' },
      });

      const result = await service.discardSubmission('campaign-1', 'submission-1', undefined, 'composer-personal-1');

      expect(result.status).toBe(CampaignSubmissionStatus.DISCARDED);
    });
  });
});
