import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Not, Repository } from 'typeorm';
import { createHash } from 'crypto';

import { User } from 'src/users/entities/user.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { EmailService } from 'src/shared/mail/services/email.service';
import { OtpService } from 'src/shared/otp/otp.service';
import { SMS_PROVIDER, SmsProvider } from 'src/shared/sms/domain/sms-provider.interface';

import { OtpVerification } from './entities/otp-verification.entity';
import { OtpChannel } from './entities/otp-channel.enum';
import { OtpPurpose } from './otp-purpose.enum';
import { OtpClientPlatform } from './otp-client-platform.type';
import { OTP_MAX_ATTEMPTS, OTP_PURPOSE_LABELS } from './otp-verification.constants';

export interface RequestOtpResult {
  channel: OtpChannel;
  expiresAt: Date;
}

@Injectable()
export class OtpVerificationService {
  constructor(
    @InjectRepository(OtpVerification)
    private readonly otpVerificationRepo: Repository<OtpVerification>,
    @InjectRepository(RequestedTrack)
    private readonly requestedTrackRepo: Repository<RequestedTrack>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(SMS_PROVIDER)
    private readonly smsProvider: SmsProvider,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly eventBus: EventBusService,
  ) {}

  async requestOtp(
    userId: string,
    purpose: OtpPurpose,
    entityId: string,
    clientPlatform: OtpClientPlatform,
  ): Promise<RequestOtpResult> {
    const entityType = await this.authorize(purpose, entityId, userId);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    await this.invalidatePendingCodes(userId, purpose, entityType, entityId);

    const { code, expiresAt } = this.otpService.generate();
    const channel = this.resolveChannel(clientPlatform);

    await this.otpVerificationRepo.save(
      this.otpVerificationRepo.create({
        userId,
        purpose,
        entityType,
        entityId,
        channel,
        codeHash: this.hashCode(code),
        expiresAt,
      }),
    );

    await this.dispatch(channel, user, code, purpose, expiresAt);

    return { channel, expiresAt };
  }

  async verifyOtp(
    userId: string,
    purpose: OtpPurpose,
    entityId: string,
    code: string,
  ): Promise<{ verified: true }> {
    const entityType = this.resolveEntityType(purpose);

    const row = await this.otpVerificationRepo.findOne({
      where: { userId, purpose, entityType, entityId, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!row || this.otpService.isExpired(row.expiresAt)) {
      throw new BadRequestException('El código expiró o no fue solicitado. Solicita uno nuevo.');
    }

    if (row.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('Se superó el número máximo de intentos. Solicita un nuevo código.');
    }

    if (this.hashCode(code) !== row.codeHash) {
      row.attempts += 1;
      await this.otpVerificationRepo.save(row);
      throw new BadRequestException('Código incorrecto');
    }

    row.verifiedAt = new Date();
    await this.otpVerificationRepo.save(row);

    return { verified: true };
  }

  /**
   * Usado por los servicios protegidos (aprobación de solicitud, firma/pago de
   * licencia) justo antes de ejecutar la acción. Exige un código ya verificado
   * y aún no consumido; lo marca como consumido para evitar su reutilización.
   */
  async assertAndConsumeVerification(
    userId: string,
    purpose: OtpPurpose,
    entityId: string,
  ): Promise<void> {
    const entityType = this.resolveEntityType(purpose);

    const row = await this.otpVerificationRepo.findOne({
      where: {
        userId,
        purpose,
        entityType,
        entityId,
        consumedAt: IsNull(),
        verifiedAt: Not(IsNull()),
        expiresAt: MoreThan(new Date()),
      },
      order: { verifiedAt: 'DESC' },
    });

    if (!row) {
      throw new ForbiddenException('Se requiere verificación por código OTP antes de esta acción');
    }

    row.consumedAt = new Date();
    await this.otpVerificationRepo.save(row);
  }

  private async invalidatePendingCodes(
    userId: string,
    purpose: OtpPurpose,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    await this.otpVerificationRepo
      .createQueryBuilder()
      .update(OtpVerification)
      .set({ expiresAt: new Date() })
      .where(
        'user_id = :userId AND purpose = :purpose AND entity_type = :entityType AND entity_id = :entityId AND consumed_at IS NULL',
        { userId, purpose, entityType, entityId },
      )
      .execute();
  }

  private resolveEntityType(purpose: OtpPurpose): string {
    switch (purpose) {
      case OtpPurpose.REQUESTED_TRACK_APPROVAL:
      case OtpPurpose.LICENSE_SIGNING:
        return 'requested_track';
      default:
        throw new BadRequestException('Propósito OTP no soportado');
    }
  }

  /** Carga la entidad objetivo y valida que el usuario tenga permiso sobre ella. */
  private async authorize(purpose: OtpPurpose, entityId: string, userId: string): Promise<string> {
    switch (purpose) {
      case OtpPurpose.REQUESTED_TRACK_APPROVAL: {
        const track = await this.requestedTrackRepo.findOne({
          where: { id: entityId },
          relations: ['owner'],
        });
        if (!track) throw new NotFoundException('La solicitud no existe');
        if (track.owner.id !== userId) {
          throw new ForbiddenException('No tienes permisos sobre esta solicitud');
        }
        return 'requested_track';
      }
      case OtpPurpose.LICENSE_SIGNING: {
        const track = await this.requestedTrackRepo.findOne({
          where: { id: entityId },
          relations: ['requester'],
        });
        if (!track) throw new NotFoundException('La solicitud no existe');
        if (track.requester.id !== userId) {
          throw new ForbiddenException('No tienes permisos sobre esta solicitud');
        }
        return 'requested_track';
      }
      default:
        throw new BadRequestException('Propósito OTP no soportado');
    }
  }

  private resolveChannel(clientPlatform: OtpClientPlatform): OtpChannel {
    return clientPlatform === 'mobile' ? OtpChannel.PUSH : OtpChannel.EMAIL;
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private async dispatch(
    channel: OtpChannel,
    user: User,
    code: string,
    purpose: OtpPurpose,
    expiresAt: Date,
  ): Promise<void> {
    const expiresInMinutes = Math.round((expiresAt.getTime() - Date.now()) / 60000);
    const purposeLabel = OTP_PURPOSE_LABELS[purpose];

    switch (channel) {
      case OtpChannel.EMAIL:
        await this.emailService.sendOtpCodeEmail(user.email, {
          code,
          purposeLabel,
          expiresInMinutes,
        });
        break;
      case OtpChannel.PUSH:
        this.eventBus.emit('otp.code.issued', {
          userId: user.id,
          code,
          purposeLabel,
          expiresAt,
        });
        break;
      case OtpChannel.SMS:
        await this.smsProvider.sendSms(
          user.phone,
          `Tu código Musila para ${purposeLabel} es ${code}. Vence en ${expiresInMinutes} minutos.`,
        );
        break;
    }
  }
}
