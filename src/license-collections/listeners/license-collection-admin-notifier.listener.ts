import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

@Injectable()
export class LicenseCollectionAdminNotifierListener {
  private readonly logger = new Logger(LicenseCollectionAdminNotifierListener.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  private async notifyAdmins(params: { type: string; title: string; message: string; data: Record<string, unknown> }) {
    const admins = await this.userRepo.find({ where: { planType: UserPlanType.ADMIN } });

    for (const admin of admins) {
      const notification = await this.notificationsService.createNotification({
        recipient: { id: admin.id } as any,
        type: params.type,
        title: params.title,
        message: params.message,
        link: '/admin/license-collections',
        data: params.data,
      });

      this.notificationsGateway.emitToUser(admin.id, 'notification.received', notification);
    }
  }

  @EventListener({
    event: 'license.collection.overdue',
    channel: 'in-app',
  })
  async handleOverdue(payload: AppEventMap['license.collection.overdue']) {
    try {
      await this.notifyAdmins({
        type: 'license.collection.overdue',
        title: 'Cobro vencido',
        message: `El anticipo de "${payload.trackTitle}" venció el ${new Date(payload.dueDate).toLocaleDateString('es-CO')} sin registrar pago.`,
        data: payload,
      });
    } catch (error) {
      this.logger.error('Error notificando a administradores sobre cobro vencido', error);
    }
  }

  @EventListener({
    event: 'license.collection.send.exhausted',
    channel: 'in-app',
  })
  async handleSendExhausted(payload: AppEventMap['license.collection.send.exhausted']) {
    try {
      await this.notifyAdmins({
        type: 'license.collection.send.exhausted',
        title: 'No se pudo enviar el enlace de pago',
        message: `Se agotaron los ${payload.attempts} intentos de envío del enlace de pago para "${payload.trackTitle}". Último error: ${payload.lastError}`,
        data: payload,
      });
    } catch (error) {
      this.logger.error('Error notificando a administradores sobre fallo de envío', error);
    }
  }
}
