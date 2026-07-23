import { createHash } from 'crypto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OtpVerificationService } from './otp-verification.service';
import { OtpVerification } from './entities/otp-verification.entity';
import { OtpChannel } from './entities/otp-channel.enum';
import { OtpPurpose } from './otp-purpose.enum';
import { OtpService } from '../otp/otp.service';
import { OTP_MAX_ATTEMPTS } from './otp-verification.constants';

const hash = (code: string) => createHash('sha256').update(code).digest('hex');

describe('OtpVerificationService', () => {
  let service: OtpVerificationService;
  let otpVerificationRepo: { save: jest.Mock; create: jest.Mock; findOne: jest.Mock; createQueryBuilder: jest.Mock };
  let requestedTrackRepo: { findOne: jest.Mock };
  let userRepo: { findOne: jest.Mock };
  let smsProvider: { sendSms: jest.Mock };
  let emailService: { sendOtpCodeEmail: jest.Mock };
  let eventBus: { emit: jest.Mock };

  const userId = 'user-1';
  const trackId = 'track-1';

  beforeEach(() => {
    const qbMock = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };

    otpVerificationRepo = {
      save: jest.fn((row) => Promise.resolve({ ...row, id: row.id ?? 'otp-1' })),
      create: jest.fn((data: Partial<OtpVerification>) => data as OtpVerification),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qbMock),
    };
    requestedTrackRepo = { findOne: jest.fn() };
    userRepo = { findOne: jest.fn().mockResolvedValue({ id: userId, email: 'owner@musila.com', phone: '3000000000' }) };
    smsProvider = { sendSms: jest.fn().mockResolvedValue(undefined) };
    emailService = { sendOtpCodeEmail: jest.fn().mockResolvedValue(undefined) };
    eventBus = { emit: jest.fn() };

    service = new OtpVerificationService(
      otpVerificationRepo as any,
      requestedTrackRepo as any,
      userRepo as any,
      smsProvider as any,
      new OtpService(),
      emailService as any,
      eventBus as any,
    );
  });

  describe('requestOtp', () => {
    it('rechaza si la solicitud no existe', async () => {
      requestedTrackRepo.findOne.mockResolvedValue(null);

      await expect(
        service.requestOtp(userId, OtpPurpose.REQUESTED_TRACK_APPROVAL, trackId, 'web'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza si el usuario no es el dueño de la solicitud', async () => {
      requestedTrackRepo.findOne.mockResolvedValue({ owner: { id: 'otro-usuario' } });

      await expect(
        service.requestOtp(userId, OtpPurpose.REQUESTED_TRACK_APPROVAL, trackId, 'web'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('canal web envía por email y persiste el código hasheado', async () => {
      requestedTrackRepo.findOne.mockResolvedValue({ owner: { id: userId } });

      const result = await service.requestOtp(userId, OtpPurpose.REQUESTED_TRACK_APPROVAL, trackId, 'web');

      expect(result.channel).toBe(OtpChannel.EMAIL);
      expect(emailService.sendOtpCodeEmail).toHaveBeenCalledWith(
        'owner@musila.com',
        expect.objectContaining({ code: expect.any(String) }),
      );
      expect(otpVerificationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ channel: OtpChannel.EMAIL, userId, entityType: 'requested_track' }),
      );
    });

    it('canal mobile envía por push (evento in-app)', async () => {
      requestedTrackRepo.findOne.mockResolvedValue({ requester: { id: userId } });

      const result = await service.requestOtp(userId, OtpPurpose.LICENSE_SIGNING, trackId, 'mobile');

      expect(result.channel).toBe(OtpChannel.PUSH);
      expect(eventBus.emit).toHaveBeenCalledWith('otp.code.issued', expect.objectContaining({ userId }));
      expect(emailService.sendOtpCodeEmail).not.toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('marca verifiedAt cuando el código coincide', async () => {
      const row = {
        id: 'otp-1',
        codeHash: hash('1234'),
        attempts: 0,
        expiresAt: new Date(Date.now() + 60_000),
        verifiedAt: null,
      };
      otpVerificationRepo.findOne.mockResolvedValue(row);

      const result = await service.verifyOtp(userId, OtpPurpose.REQUESTED_TRACK_APPROVAL, trackId, '1234');

      expect(result.verified).toBe(true);
      expect(otpVerificationRepo.save).toHaveBeenCalledWith(expect.objectContaining({ verifiedAt: expect.any(Date) }));
    });

    it('incrementa intentos y rechaza cuando el código no coincide', async () => {
      const row = {
        id: 'otp-1',
        codeHash: hash('1234'),
        attempts: 0,
        expiresAt: new Date(Date.now() + 60_000),
      };
      otpVerificationRepo.findOne.mockResolvedValue(row);

      await expect(
        service.verifyOtp(userId, OtpPurpose.REQUESTED_TRACK_APPROVAL, trackId, '0000'),
      ).rejects.toThrow('Código incorrecto');
      expect(otpVerificationRepo.save).toHaveBeenCalledWith(expect.objectContaining({ attempts: 1 }));
    });

    it('rechaza cuando no hay código vigente', async () => {
      otpVerificationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.verifyOtp(userId, OtpPurpose.REQUESTED_TRACK_APPROVAL, trackId, '1234'),
      ).rejects.toThrow('El código expiró o no fue solicitado. Solicita uno nuevo.');
    });

    it('rechaza cuando se superó el máximo de intentos', async () => {
      otpVerificationRepo.findOne.mockResolvedValue({
        codeHash: hash('1234'),
        attempts: OTP_MAX_ATTEMPTS,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(
        service.verifyOtp(userId, OtpPurpose.REQUESTED_TRACK_APPROVAL, trackId, '1234'),
      ).rejects.toThrow('Se superó el número máximo de intentos. Solicita un nuevo código.');
    });
  });

  describe('assertAndConsumeVerification', () => {
    it('marca consumedAt cuando existe una verificación vigente', async () => {
      const row = { id: 'otp-1', consumedAt: null };
      otpVerificationRepo.findOne.mockResolvedValue(row);

      await service.assertAndConsumeVerification(userId, OtpPurpose.REQUESTED_TRACK_APPROVAL, trackId);

      expect(otpVerificationRepo.save).toHaveBeenCalledWith(expect.objectContaining({ consumedAt: expect.any(Date) }));
    });

    it('rechaza si no hay una verificación previa vigente', async () => {
      otpVerificationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.assertAndConsumeVerification(userId, OtpPurpose.REQUESTED_TRACK_APPROVAL, trackId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
