import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { ADMIN_PLAN_TYPES } from 'src/users/entities/user-plan-type.enum';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';
import { EmailService } from 'src/shared/mail/services/email.service';
import { BankInformationRequest } from '../entities/bank-information-request.entity';
import { BankInformationRequestStatus } from '../entities/bank-information-request-status.enum';

const CURRENCY_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

export const MAX_NOTIFICATION_ATTEMPTS = 3;

/**
 * Notificación in-app + email al participante del Split que debe configurar
 * su información bancaria, con reintentos (mismo patrón de
 * `WalletNotificationService`): hasta 3 intentos, cron cada 15 min, alerta a
 * administradores si se agotan.
 */
@Injectable()
export class BankInformationNotificationService {
  private readonly logger = new Logger(BankInformationNotificationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(BankInformationRequest)
    private readonly requestRepo: Repository<BankInformationRequest>,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly emailService: EmailService,
  ) {}

  /** Notifica al participante que debe configurar su información bancaria de cobro. */
  async notifyRequested(
    request: BankInformationRequest,
    recipient: { userId: string; name: string; email: string },
  ): Promise<void> {
    await this.attempt(request, async () => {
      const amountLabel = CURRENCY_FORMATTER.format(Number(request.advanceAmount));
      const notification = await this.notificationsService.createNotification({
        recipient: { id: recipient.userId } as any,
        type: 'wallet.bank_information.requested',
        title: 'Configura tu información bancaria',
        message: `Tienes un anticipo de ${amountLabel} por "${request.trackTitle}". Configura tu información bancaria para poder cobrarlo.`,
        link: '/music/wallet',
        data: { requestId: request.id, contractId: request.licenseContract.id },
      });
      this.notificationsGateway.emitToUser(recipient.userId, 'notification.received', notification);

      await this.emailService.sendBankInformationRequestedEmail(recipient.email, {
        userName: recipient.name,
        trackTitle: request.trackTitle,
        advanceAmount: amountLabel,
        actionUrl: '/music/wallet',
      });
    });
  }

  /** Alerta a los admins que no se pudo notificar a un usuario tras agotar los reintentos. */
  async notifyAdminsNotificationExhausted(request: BankInformationRequest): Promise<void> {
    const admins = await this.userRepo.find({ where: { planType: In(ADMIN_PLAN_TYPES) } });
    for (const admin of admins) {
      const notification = await this.notificationsService.createNotification({
        recipient: { id: admin.id } as any,
        type: 'wallet.bank_information.notification.exhausted',
        title: 'No se pudo notificar a un usuario sobre su información bancaria',
        message: `No se pudo notificar la solicitud de información bancaria ${request.id} (track "${request.trackTitle}"). Contacta al usuario manualmente.`,
        link: '/admin/wallet',
        data: { requestId: request.id },
      });
      this.notificationsGateway.emitToUser(admin.id, 'notification.received', notification);

      await this.emailService.sendBankInformationExhaustedAdminEmail(admin.email, {
        adminName: admin.name,
        userName: request.user?.name ?? 'Usuario',
        trackTitle: request.trackTitle,
        requestId: request.id,
      });
    }
  }

  /** Reintenta notificar solicitudes pendientes que aún no se hayan podido notificar. */
  async retryPending(): Promise<void> {
    const pending = await this.requestRepo.find({
      where: { status: BankInformationRequestStatus.PENDING, notifiedAt: IsNull() },
      relations: ['user', 'licenseContract'],
    });

    for (const request of pending) {
      if (request.notificationAttempts >= MAX_NOTIFICATION_ATTEMPTS) {
        await this.notifyAdminsNotificationExhausted(request);
        continue;
      }
      if (!request.user) continue;
      await this.notifyRequested(request, {
        userId: request.user.id,
        name: `${request.user.name} ${request.user.lastName}`.trim(),
        email: request.user.email,
      });
    }
  }

  private async attempt(request: BankInformationRequest, action: () => Promise<void>): Promise<void> {
    try {
      await action();
      request.notifiedAt = new Date();
      await this.requestRepo.update(request.id, { notifiedAt: request.notifiedAt });
    } catch (error: any) {
      request.notificationAttempts += 1;
      request.notificationLastError = error?.message ?? 'Error desconocido';
      await this.requestRepo.update(request.id, {
        notificationAttempts: request.notificationAttempts,
        notificationLastError: request.notificationLastError,
      });
      this.logger.error(
        `Error notificando solicitud de información bancaria ${request.id} (intento ${request.notificationAttempts})`,
        error,
      );
    }
  }
}
