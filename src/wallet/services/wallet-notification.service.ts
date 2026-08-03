import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { ADMIN_PLAN_TYPES } from 'src/users/entities/user-plan-type.enum';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';
import { EmailService } from 'src/shared/mail/services/email.service';
import { WalletWithdrawal } from '../entities/wallet-withdrawal.entity';
import { WalletWithdrawalStatus } from '../entities/wallet-withdrawal-status.enum';

const CURRENCY_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

export const MAX_NOTIFICATION_ATTEMPTS = 3;

@Injectable()
export class WalletNotificationService {
  private readonly logger = new Logger(WalletNotificationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(WalletWithdrawal)
    private readonly withdrawalRepo: Repository<WalletWithdrawal>,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly emailService: EmailService,
  ) {}

  /** Notifica a todos los admins que hay una nueva solicitud de retiro pendiente. */
  async notifyAdminsRequested(withdrawal: WalletWithdrawal): Promise<void> {
    await this.attempt(withdrawal, async () => {
      const admins = await this.userRepo.find({ where: { planType: In(ADMIN_PLAN_TYPES) } });
      const amountLabel = CURRENCY_FORMATTER.format(withdrawal.amount);

      for (const admin of admins) {
        const notification = await this.notificationsService.createNotification({
          recipient: { id: admin.id } as any,
          type: 'wallet.withdrawal.requested',
          title: 'Nueva solicitud de retiro',
          message: `${withdrawal.user.name} ${withdrawal.user.lastName} solicitó un retiro de ${amountLabel}.`,
          link: '/admin/wallet',
          data: { withdrawalId: withdrawal.id },
        });
        this.notificationsGateway.emitToUser(admin.id, 'notification.received', notification);

        await this.emailService.sendWalletWithdrawalRequestedAdminEmail(admin.email, {
          adminName: admin.name,
          userName: `${withdrawal.user.name} ${withdrawal.user.lastName}`,
          userEmail: withdrawal.user.email,
          amount: amountLabel,
          withdrawalUrl: '/admin/wallet',
        });
      }
    });
  }

  /** Notifica al usuario dueño que su retiro fue pagado. */
  async notifyUserPaid(withdrawal: WalletWithdrawal): Promise<void> {
    await this.attempt(withdrawal, async () => {
      const amountLabel = CURRENCY_FORMATTER.format(withdrawal.amount);
      const notification = await this.notificationsService.createNotification({
        recipient: { id: withdrawal.user.id } as any,
        type: 'wallet.withdrawal.paid',
        title: 'Tu retiro fue pagado',
        message: `Tu retiro de ${amountLabel} fue marcado como pagado.`,
        link: '/music/wallet',
        data: { withdrawalId: withdrawal.id },
      });
      this.notificationsGateway.emitToUser(withdrawal.user.id, 'notification.received', notification);

      await this.emailService.sendWalletWithdrawalPaidEmail(withdrawal.user.email, {
        userName: `${withdrawal.user.name} ${withdrawal.user.lastName}`,
        amount: amountLabel,
        paidAt: (withdrawal.paidAt ?? new Date()).toLocaleString('es-CO'),
        accountUrl: '/music/wallet',
      });
    });
  }

  /** Notifica al usuario dueño que su retiro fue rechazado. */
  async notifyUserRejected(withdrawal: WalletWithdrawal): Promise<void> {
    await this.attempt(withdrawal, async () => {
      const amountLabel = CURRENCY_FORMATTER.format(withdrawal.amount);
      const notification = await this.notificationsService.createNotification({
        recipient: { id: withdrawal.user.id } as any,
        type: 'wallet.withdrawal.rejected',
        title: 'Tu retiro fue rechazado',
        message: `Tu retiro de ${amountLabel} fue rechazado: ${withdrawal.rejectionReason}`,
        link: '/music/wallet',
        data: { withdrawalId: withdrawal.id },
      });
      this.notificationsGateway.emitToUser(withdrawal.user.id, 'notification.received', notification);

      await this.emailService.sendWalletWithdrawalRejectedEmail(withdrawal.user.email, {
        userName: `${withdrawal.user.name} ${withdrawal.user.lastName}`,
        amount: amountLabel,
        reason: withdrawal.rejectionReason ?? '',
        accountUrl: '/music/wallet',
      });
    });
  }

  /** Alerta a los admins que no se pudo notificar a un usuario tras agotar los reintentos. */
  async notifyAdminsNotificationExhausted(withdrawal: WalletWithdrawal): Promise<void> {
    const admins = await this.userRepo.find({ where: { planType: In(ADMIN_PLAN_TYPES) } });
    for (const admin of admins) {
      const notification = await this.notificationsService.createNotification({
        recipient: { id: admin.id } as any,
        type: 'wallet.withdrawal.notification.exhausted',
        title: 'No se pudo notificar a un usuario sobre su retiro',
        message: `No se pudo notificar a ${withdrawal.user.name} ${withdrawal.user.lastName} sobre su retiro ${withdrawal.id}. Contáctalo manualmente.`,
        link: '/admin/wallet',
        data: { withdrawalId: withdrawal.id },
      });
      this.notificationsGateway.emitToUser(admin.id, 'notification.received', notification);
    }
  }

  /** Reintenta notificar retiros pagados/rechazados que aún no se hayan podido notificar. */
  async retryPending(): Promise<void> {
    const pending = await this.withdrawalRepo.find({
      where: [
        { status: WalletWithdrawalStatus.PAID, notifiedAt: IsNull() },
        { status: WalletWithdrawalStatus.REJECTED, notifiedAt: IsNull() },
      ],
      relations: ['user'],
    });

    for (const withdrawal of pending) {
      if (withdrawal.notificationAttempts >= MAX_NOTIFICATION_ATTEMPTS) {
        await this.notifyAdminsNotificationExhausted(withdrawal);
        continue;
      }

      if (withdrawal.status === WalletWithdrawalStatus.PAID) {
        await this.notifyUserPaid(withdrawal);
      } else {
        await this.notifyUserRejected(withdrawal);
      }
    }
  }

  private async attempt(withdrawal: WalletWithdrawal, action: () => Promise<void>): Promise<void> {
    try {
      await action();
      withdrawal.notifiedAt = new Date();
      await this.withdrawalRepo.update(withdrawal.id, { notifiedAt: withdrawal.notifiedAt });
    } catch (error: any) {
      withdrawal.notificationAttempts += 1;
      withdrawal.notificationLastError = error?.message ?? 'Error desconocido';
      await this.withdrawalRepo.update(withdrawal.id, {
        notificationAttempts: withdrawal.notificationAttempts,
        notificationLastError: withdrawal.notificationLastError,
      });
      this.logger.error(
        `Error notificando retiro ${withdrawal.id} (intento ${withdrawal.notificationAttempts})`,
        error,
      );
    }
  }
}
