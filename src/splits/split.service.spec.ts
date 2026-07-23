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
    trackRepo = { findOne: jest.fn().mockResolvedValue(track) };
    userRepo = { find: jest.fn().mockResolvedValue([coauthorUser]) };
    ipRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'ip-1', ...data })),
    };
    eventBus = { emit: jest.fn() };
    otpVerificationService = { assertAndConsumeVerification: jest.fn().mockResolvedValue(undefined) };

    service = new SplitService(
      splitRepo,
      splitAuthorRepo,
      trackRepo,
      userRepo,
      ipRepo,
      eventBus as any,
      otpVerificationService as any,
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
