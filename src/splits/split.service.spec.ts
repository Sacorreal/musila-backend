import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SplitService } from './split.service';
import { SplitStatus } from './entities/split-status.enum';
import { SplitAuthorStatus } from './entities/split-author-status.enum';
import { CoauthorRole } from './entities/coauthor-role.enum';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

describe('SplitService', () => {
  let service: SplitService;
  let splitRepo: any;
  let splitAuthorRepo: any;
  let trackRepo: any;
  let userRepo: any;
  let ipRepo: any;
  let eventBus: { emit: jest.Mock };
  let otpVerificationService: { assertAndConsumeVerification: jest.Mock };
  let legalProofService: { generateProof: jest.Mock };
  let authorizationService: { check: jest.Mock };
  let publisherShareService: { resolveForUser: jest.Mock };
  let legalIdentityService: { buildEncryptedSnapshot: jest.Mock; decryptSnapshot: jest.Mock };

  const admin: JwtPayload = { id: 'author-1', email: 'author1@musila.com', name: 'Autor Uno', planType: UserPlanType.PLAN_AUTOR };
  const coauthorUser = { id: 'author-2', email: 'author2@musila.com', name: 'Autor', lastName: 'Dos' };

  const track = { id: 'track-1', title: 'Mi Canción', authors: [{ id: admin.id }] };

  beforeEach(() => {
    splitRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: data.id ?? 'split-1', ...data })),
    };
    splitAuthorRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    trackRepo = {
      findOne: jest.fn().mockResolvedValue(track),
      save: jest.fn((data) => Promise.resolve(data)),
    };
    userRepo = { find: jest.fn().mockResolvedValue([coauthorUser]) };
    ipRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'ip-1', ...data })),
    };
    eventBus = { emit: jest.fn() };
    otpVerificationService = { assertAndConsumeVerification: jest.fn().mockResolvedValue(undefined) };
    legalProofService = { generateProof: jest.fn().mockResolvedValue({ legalProofId: 'proof-1' }) };
    authorizationService = { check: jest.fn().mockResolvedValue({ allowed: false }) };
    publisherShareService = { resolveForUser: jest.fn().mockResolvedValue([]) };
    legalIdentityService = {
      buildEncryptedSnapshot: jest.fn().mockResolvedValue('encrypted-snapshot'),
      decryptSnapshot: jest.fn().mockReturnValue({ primerNombre: 'Sofía' }),
    };

    service = new SplitService(
      splitRepo,
      splitAuthorRepo,
      trackRepo,
      userRepo,
      ipRepo,
      eventBus as any,
      otpVerificationService as any,
      legalProofService as any,
      authorizationService as any,
      publisherShareService as any,
      legalIdentityService as any,
    );
  });

  describe('createSplit', () => {
    it('rechaza si la suma de porcentajes no es 100', async () => {
      splitRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createSplit('track-1', { authors: [{ userId: 'author-2', percentage: 60, role: CoauthorRole.AUTOR }] }, admin),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza si el usuario no es autor del track', async () => {
      const otherUser: JwtPayload = { ...admin, id: 'intruso' };
      splitRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createSplit('track-1', { authors: [{ userId: 'author-2', percentage: 100, role: CoauthorRole.AUTOR }] }, otherUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza si el track ya tiene un split registrado', async () => {
      splitRepo.findOne.mockResolvedValue({ id: 'existing-split' });

      await expect(
        service.createSplit('track-1', { authors: [{ userId: 'author-2', percentage: 100, role: CoauthorRole.AUTOR }] }, admin),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza si un coautor no existe en el sistema', async () => {
      splitRepo.findOne.mockResolvedValue(null);
      userRepo.find.mockResolvedValue([]);

      await expect(
        service.createSplit('track-1', { authors: [{ userId: 'author-2', percentage: 100, role: CoauthorRole.AUTOR }] }, admin),
      ).rejects.toThrow(NotFoundException);
    });

    it('crea el split y emite split.created cuando todo es válido', async () => {
      splitRepo.findOne
        .mockResolvedValueOnce(null) // no existing split
        .mockResolvedValueOnce({
          // findSplitWithRelationsOrFail
          id: 'split-1',
          track,
          createdBy: admin,
          status: SplitStatus.PENDING_APPROVAL,
          authors: [{ id: 'sa-1', user: coauthorUser, percentage: 100, role: CoauthorRole.AUTOR, status: SplitAuthorStatus.PENDING }],
        });

      const result = await service.createSplit(
        'track-1',
        { authors: [{ userId: 'author-2', percentage: 100, role: CoauthorRole.AUTOR }] },
        admin,
      );

      expect(result.id).toBe('split-1');
      expect(eventBus.emit).toHaveBeenCalledWith('split.created', expect.objectContaining({ trackId: 'track-1' }));
    });
  });

  describe('autoCompleteSingleAuthorSplit', () => {
    const soleAuthor = { id: 'author-1', name: 'Autor Uno' };
    const singleAuthorTrack = { id: 'track-1', title: 'Mi Canción', authors: [soleAuthor], isAvailable: false };

    it('no hace nada si el track tiene más de un autor', async () => {
      trackRepo.findOne.mockResolvedValue({ ...singleAuthorTrack, authors: [soleAuthor, coauthorUser] });

      await service.autoCompleteSingleAuthorSplit('track-1', soleAuthor.id);

      expect(splitRepo.findOne).not.toHaveBeenCalled();
      expect(splitRepo.save).not.toHaveBeenCalled();
    });

    it('no hace nada si el track ya tiene un split', async () => {
      trackRepo.findOne.mockResolvedValue(singleAuthorTrack);
      splitRepo.findOne.mockResolvedValue({ id: 'existing-split' });

      await service.autoCompleteSingleAuthorSplit('track-1', soleAuthor.id);

      expect(splitRepo.save).not.toHaveBeenCalled();
    });

    it('crea y completa el split al 100% sin OTP, y audita el éxito', async () => {
      trackRepo.findOne.mockResolvedValue(singleAuthorTrack);
      splitRepo.findOne
        .mockResolvedValueOnce(null) // no existing split
        .mockResolvedValueOnce({
          // findSplitWithRelationsOrFail tras el save
          id: 'split-1',
          track: singleAuthorTrack,
          createdBy: soleAuthor,
          status: SplitStatus.PENDING_APPROVAL,
          authors: [
            { id: 'sa-1', user: soleAuthor, percentage: 100, role: CoauthorRole.COMPOSITOR_AUTOR, status: SplitAuthorStatus.APPROVED },
          ],
        });

      await service.autoCompleteSingleAuthorSplit('track-1', soleAuthor.id);

      expect(splitAuthorRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ percentage: 100, status: SplitAuthorStatus.APPROVED }),
      );
      expect(otpVerificationService.assertAndConsumeVerification).not.toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith('split.completed', expect.objectContaining({ splitId: 'split-1' }));
      expect(eventBus.emit).toHaveBeenCalledWith(
        'staff.audit.captured',
        expect.objectContaining({ module: 'splits', action: 'split.auto_complete', outcome: 'success' }),
      );
    });

    it('audita el fallo y relanza el error si la finalización del split falla', async () => {
      trackRepo.findOne.mockResolvedValue(singleAuthorTrack);
      splitRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null); // findSplitWithRelationsOrFail no lo encuentra

      await expect(service.autoCompleteSingleAuthorSplit('track-1', soleAuthor.id)).rejects.toThrow(NotFoundException);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'staff.audit.captured',
        expect.objectContaining({ module: 'splits', action: 'split.auto_complete', outcome: 'failure' }),
      );
    });
  });

  describe("Publisher's Share (metadata informativa)", () => {
    const withCreatedSplit = () =>
      splitRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'split-1',
          track,
          createdBy: admin,
          status: SplitStatus.PENDING_APPROVAL,
          authors: [{ id: 'sa-1', user: coauthorUser, percentage: 100, role: CoauthorRole.AUTOR, status: SplitAuthorStatus.PENDING }],
        });

    it("no crea split_author para la publisher: su Publisher's Share es metadata aparte", async () => {
      withCreatedSplit();
      publisherShareService.resolveForUser.mockResolvedValue([
        { organizationId: 'org-1', organizationName: 'Sony', percentage: 20 },
      ]);

      const result = await service.createSplit(
        'track-1',
        { authors: [{ userId: 'author-2', percentage: 100, role: CoauthorRole.AUTOR }] },
        admin,
      );

      const createdSplit = splitRepo.create.mock.calls[0][0];
      expect(createdSplit.authors.every((a: any) => a.user)).toBe(true);
      expect(createdSplit.authors.some((a: any) => a.organization)).toBe(false);
      // El Publisher's Share viaja como transient en la respuesta, no como coautor.
      expect(result.publisherShares).toEqual([
        { organizationId: 'org-1', organizationName: 'Sony', percentage: 20 },
      ]);
    });

    it("los coautores humanos deben sumar 100 con o sin Publisher's Share", async () => {
      splitRepo.findOne.mockResolvedValue(null);
      publisherShareService.resolveForUser.mockResolvedValue([
        { organizationId: 'org-1', organizationName: 'Sony', percentage: 20 },
      ]);

      await expect(
        service.createSplit('track-1', { authors: [{ userId: 'author-2', percentage: 80, role: CoauthorRole.AUTOR }] }, admin),
      ).rejects.toThrow(BadRequestException);
    });

    it("el Publisher's Share no recorta el % de los humanos aunque sea alto", async () => {
      withCreatedSplit();
      publisherShareService.resolveForUser.mockResolvedValue([
        { organizationId: 'org-1', organizationName: 'Sony', percentage: 100 },
      ]);

      await expect(
        service.createSplit('track-1', { authors: [{ userId: 'author-2', percentage: 100, role: CoauthorRole.AUTOR }] }, admin),
      ).resolves.toBeDefined();
    });
  });

  describe('approveSplitAuthor / rejectSplitAuthor', () => {
    const pendingSplit = () => ({
      id: 'split-1',
      track,
      createdBy: { id: admin.id, email: admin.email, name: admin.name },
      status: SplitStatus.PENDING_APPROVAL,
      authors: [
        { id: 'sa-1', user: { id: admin.id }, percentage: 50, role: CoauthorRole.AUTOR, status: SplitAuthorStatus.APPROVED },
        { id: 'sa-2', user: coauthorUser, percentage: 50, role: CoauthorRole.COMPOSITOR, status: SplitAuthorStatus.PENDING },
      ],
    });

    it('exige verificación OTP antes de aprobar', async () => {
      splitRepo.findOne.mockResolvedValue(pendingSplit());

      const coauthorPayload: JwtPayload = { id: coauthorUser.id, email: coauthorUser.email, name: coauthorUser.name, planType: UserPlanType.PLAN_AUTOR };
      await service.approveSplitAuthor('split-1', coauthorPayload);

      expect(otpVerificationService.assertAndConsumeVerification).toHaveBeenCalledWith(
        coauthorUser.id,
        'split-signing',
        'split-1',
      );
    });

    it('completa el split y genera el registro de IP cuando todos aprueban', async () => {
      const split = pendingSplit();
      splitRepo.findOne
        .mockResolvedValueOnce(split) // findSplitWithRelationsOrFail (approve)
        .mockResolvedValueOnce({ ...split, status: SplitStatus.COMPLETED }); // findSplitWithRelationsOrFail (return)

      const coauthorPayload: JwtPayload = { id: coauthorUser.id, email: coauthorUser.email, name: coauthorUser.name, planType: UserPlanType.PLAN_AUTOR };
      await service.approveSplitAuthor('split-1', coauthorPayload);

      expect(ipRepo.save).toHaveBeenCalled();
      expect(legalProofService.generateProof).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({ entityType: 'co_authorship', entityId: 'split-1' }),
        }),
      );
      // La firma de todos los coautores publica el track automáticamente.
      expect(trackRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'track-1', isAvailable: true }));
      expect(eventBus.emit).toHaveBeenCalledWith(
        'split.completed',
        expect.objectContaining({
          splitId: 'split-1',
          authors: expect.arrayContaining([
            expect.objectContaining({ userId: admin.id }),
            expect.objectContaining({ userId: coauthorUser.id }),
          ]),
        }),
      );
    });

    it('completa el split igual aunque falle la generación de evidencia legal', async () => {
      const split = pendingSplit();
      splitRepo.findOne
        .mockResolvedValueOnce(split)
        .mockResolvedValueOnce({ ...split, status: SplitStatus.COMPLETED });
      legalProofService.generateProof.mockRejectedValue(new Error('timestamp provider down'));

      const coauthorPayload: JwtPayload = { id: coauthorUser.id, email: coauthorUser.email, name: coauthorUser.name, planType: UserPlanType.PLAN_AUTOR };

      await expect(service.approveSplitAuthor('split-1', coauthorPayload)).resolves.toBeDefined();
      expect(eventBus.emit).toHaveBeenCalledWith('split.completed', expect.objectContaining({ splitId: 'split-1' }));
    });

    it('bloquea el split cuando un coautor rechaza con motivo', async () => {
      splitRepo.findOne.mockResolvedValue(pendingSplit());

      const coauthorPayload: JwtPayload = { id: coauthorUser.id, email: coauthorUser.email, name: coauthorUser.name, planType: UserPlanType.PLAN_AUTOR };
      await service.rejectSplitAuthor('split-1', { reason: 'No estoy de acuerdo con el porcentaje' }, coauthorPayload);

      expect(splitRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: SplitStatus.BLOCKED }));
      expect(eventBus.emit).toHaveBeenCalledWith('split.author.rejected', expect.objectContaining({ reason: 'No estoy de acuerdo con el porcentaje' }));
    });
  });

  describe('updateSplit', () => {
    it('rechaza editar un split que no está bloqueado', async () => {
      splitRepo.findOne.mockResolvedValue({
        id: 'split-1',
        track,
        status: SplitStatus.PENDING_APPROVAL,
        authors: [],
      });

      await expect(
        service.updateSplit('split-1', { authors: [{ userId: 'author-2', percentage: 100, role: CoauthorRole.AUTOR }] }, admin),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
