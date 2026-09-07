import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { Notification } from 'src/notifications/entities/notification.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { SubjectType } from 'src/entitlements/entities/subject-type.enum';
import { Subscription } from 'src/entitlements/entities/subscription.entity';
import { SubscriptionStatus } from 'src/entitlements/entities/subscription-status.enum';
import { Between, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

const NOTIFICATION_TYPE = 'organization_subscription_reminder';

/**
 * Recordatorio de vencimiento de la suscripción B2B (§Registro Legal B2B,
 * paso 10): 5 y 1 días antes del vencimiento. Mismo patrón e idempotencia
 * que `PlanExpiryNotificationsService`, pero para `entitlements.Subscription`
 * con `subjectType = ORGANIZATION` en vez de `User.planExpiresAt`.
 */
@Injectable()
export class OrganizationSubscriptionRemindersService {
  private readonly logger = new Logger(OrganizationSubscriptionRemindersService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly eventBus: EventBusService,
  ) {}

  /** Corre cada día a las 15:00 UTC, igual que el recordatorio de planes individuales. */
  @Cron('0 15 * * *')
  async handleDailyCheck() {
    this.logger.log('[OrgSubscriptionReminders] chequeo diario de suscripciones B2B próximas a vencer');
    await this.notifyAtDays(5);
    await this.notifyAtDays(1);
  }

  private async notifyAtDays(daysAhead: number) {
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() + daysAhead);
    windowStart.setHours(0, 0, 0, 0);
    const windowEnd = new Date(windowStart);
    windowEnd.setHours(23, 59, 59, 999);

    const expiring = await this.subscriptionRepo.find({
      where: { subjectType: SubjectType.ORGANIZATION, status: SubscriptionStatus.ACTIVE, endAt: Between(windowStart, windowEnd) },
    });

    this.logger.log(`[OrgSubscriptionReminders] ${expiring.length} organizaciones vencen en ${daysAhead} días`);

    for (const subscription of expiring) {
      await this.notifyOrganization(subscription, daysAhead);
    }
  }

  private async notifyOrganization(subscription: Subscription, daysRemaining: number) {
    const organization = await this.organizationRepo.findOne({ where: { id: subscription.subjectId } });
    if (!organization || !organization.registeredByUserId) return;

    const exists = await this.notificationRepo.findOne({
      where: {
        type: NOTIFICATION_TYPE,
        recipient: { id: organization.registeredByUserId },
        data: { subscriptionId: subscription.id, daysRemaining } as any,
      },
    });
    if (exists) return;

    const user = await this.userRepo.findOne({ where: { id: organization.registeredByUserId } });
    if (!user) return;

    await this.notificationRepo.save({
      recipient: { id: user.id },
      title: daysRemaining === 1 ? 'Tu suscripción vence mañana' : `Tu suscripción vence en ${daysRemaining} días`,
      message: `La suscripción de "${organization.name}" vence pronto. Verifica tu medio de pago para evitar la suspensión del servicio.`,
      type: NOTIFICATION_TYPE,
      link: `/org/${organization.id}/billing`,
      data: { subscriptionId: subscription.id, daysRemaining },
    });

    this.eventBus.emit('organization.subscription.reminder', {
      organizationId: organization.id,
      organizationName: organization.name,
      adminEmail: user.email,
      daysRemaining,
      dueDate: subscription.endAt as Date,
    });
  }
}
