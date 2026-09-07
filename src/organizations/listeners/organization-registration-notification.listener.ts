import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';
import { NotificationsService } from 'src/notifications/notifications.service';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { User } from 'src/users/entities/user.entity';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';

/**
 * Notificaciones in-app/WS del onboarding comercial B2B (§Registro Legal
 * B2B): al admin de Musila (nueva solicitud) y a la organización (cada
 * cambio de estado de su propia solicitud). Mismo patrón que
 * `PromotionNotificationListener`.
 */
@Injectable()
export class OrganizationRegistrationNotificationListener {
  private readonly logger = new Logger(OrganizationRegistrationNotificationListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @EventListener({ event: 'organization.registration.submitted', channel: 'in-app' })
  async onSubmitted(payload: AppEventMap['organization.registration.submitted']) {
    await this.notifyMusilaAdmins(
      'Nueva solicitud de registro B2B',
      `"${payload.organizationName}" solicitó registrarse como organización.`,
      'organization.registration.submitted',
    );
  }

  @EventListener({ event: 'organization.registration.approved', channel: 'in-app' })
  async onApproved(payload: AppEventMap['organization.registration.approved']) {
    await this.notifyRegistrant(
      payload.adminEmail,
      'Tu solicitud fue aprobada',
      payload.paymentLinkUrl
        ? `Tu solicitud para "${payload.organizationName}" fue aprobada. Completa el pago para continuar.`
        : `Tu solicitud para "${payload.organizationName}" fue aprobada. Musila validará tu pago manualmente.`,
      'organization.registration.approved',
    );
  }

  @EventListener({ event: 'organization.registration.rejected', channel: 'in-app' })
  async onRejected(payload: AppEventMap['organization.registration.rejected']) {
    await this.notifyRegistrant(
      payload.adminEmail,
      'Tu solicitud fue rechazada',
      `Tu solicitud para "${payload.organizationName}" fue rechazada. Motivo: ${payload.reason}`,
      'organization.registration.rejected',
    );
  }

  @EventListener({ event: 'organization.registration.created', channel: 'in-app' })
  async onCreated(payload: AppEventMap['organization.registration.created']) {
    await this.notifyRegistrant(
      payload.adminEmail,
      'Tu organización fue creada',
      `Ya puedes activar tu perfil de administrador para "${payload.organizationName}".`,
      'organization.registration.created',
    );
  }

  @EventListener({ event: 'organization.registration.verified', channel: 'in-app' })
  async onVerified(payload: AppEventMap['organization.registration.verified']) {
    await this.notifyRegistrant(
      payload.adminEmail,
      '¡Tu organización está verificada!',
      `"${payload.organizationName}" ya puede invitar staff y roster.`,
      'organization.registration.verified',
    );
  }

  @EventListener({ event: 'organization.subscription.reminder', channel: 'in-app' })
  async onSubscriptionReminder(payload: AppEventMap['organization.subscription.reminder']) {
    await this.notifyRegistrant(
      payload.adminEmail,
      payload.daysRemaining === 1 ? 'Tu suscripción vence mañana' : `Tu suscripción vence en ${payload.daysRemaining} días`,
      `La suscripción de "${payload.organizationName}" vence pronto. Verifica tu medio de pago.`,
      'organization.subscription.reminder',
    );
  }

  @EventListener({ event: 'organization.subscription.suspended', channel: 'in-app' })
  async onSubscriptionSuspended(payload: AppEventMap['organization.subscription.suspended']) {
    await this.notifyRegistrant(
      payload.adminEmail,
      'Suscripción suspendida',
      `El acceso de "${payload.organizationName}" fue congelado por falta de pago.`,
      'organization.subscription.suspended',
    );
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Notifica a todos los usuarios con plan administrativo (admin de Musila). */
  private async notifyMusilaAdmins(title: string, message: string, type: string) {
    try {
      const admins = await this.userRepo.find({
        where: { planType: In([UserPlanType.SUPERADMIN, UserPlanType.ADMIN]) },
        select: { id: true },
      });
      await this.dispatch(admins.map((a) => a.id), title, message, type, '/admin/organizations');
    } catch (err) {
      this.logger.error(`Error notificando admins de Musila (${type}): ${(err as Error)?.message}`);
    }
  }

  /** Notifica al usuario que envió el `createBusinessForm` (resuelto por email). */
  private async notifyRegistrant(email: string, title: string, message: string, type: string) {
    try {
      const registrant = await this.userRepo.findOne({ where: { email }, select: { id: true } });
      if (!registrant) return;
      await this.dispatch([registrant.id], title, message, type, '/org/onboarding');
    } catch (err) {
      this.logger.error(`Error notificando solicitante (${type}): ${(err as Error)?.message}`);
    }
  }

  private async dispatch(
    userIds: string[],
    title: string,
    message: string,
    type: string,
    link: string,
  ) {
    for (const userId of userIds) {
      if (!userId) continue;
      const notification = await this.notificationsService.createNotification({
        recipient: { id: userId } as User,
        title,
        message,
        type,
        link,
      });
      this.notificationsGateway.emitToUser(userId, 'notification.received', notification);
    }
  }
}
