import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { Notification } from 'src/notifications/entities/notification.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { SubjectType } from 'src/entitlements/entities/subject-type.enum';
import { Subscription } from 'src/entitlements/entities/subscription.entity';
import { SubscriptionStatus } from 'src/entitlements/entities/subscription-status.enum';
import { LessThan, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

const NOTIFICATION_TYPE = 'organization_subscription_suspended';
const GRACE_PERIOD_DAYS = 5;

/**
 * Congela el acceso de organizaciones B2B sin pago 5 días después del
 * vencimiento (§Registro Legal B2B, paso 10). No introduce un estado nuevo
 * en `SubscriptionStatus`: `PAST_DUE` ya representa "vencida sin pago"; este
 * cron solo detecta cuándo el período de gracia expiró y lo notifica — es la
 * puerta que consultan los guards de acceso a funciones pagas.
 */
@Injectable()
export class OrganizationSubscriptionSuspensionService {
  private readonly logger = new Logger(OrganizationSubscriptionSuspensionService.name);

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

  /** Corre cada día a las 16:00 UTC, después de intentar la renovación y avisar. */
  @Cron('0 16 * * *')
  async handleDailySuspensionCheck() {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - GRACE_PERIOD_DAYS);

    const overdue = await this.subscriptionRepo.find({
      where: { subjectType: SubjectType.ORGANIZATION, status: SubscriptionStatus.PAST_DUE, endAt: LessThan(threshold) },
    });

    this.logger.log(`[OrgSubscriptionSuspension] ${overdue.length} organizaciones fuera del período de gracia`);

    for (const subscription of overdue) {
      await this.notifySuspended(subscription);
    }
  }

  private async notifySuspended(subscription: Subscription) {
    const organization = await this.organizationRepo.findOne({ where: { id: subscription.subjectId } });
    if (!organization || !organization.registeredByUserId) return;

    const exists = await this.notificationRepo.findOne({
      where: { type: NOTIFICATION_TYPE, recipient: { id: organization.registeredByUserId } },
    });
    if (exists) return;

    const user = await this.userRepo.findOne({ where: { id: organization.registeredByUserId } });
    if (!user) return;

    await this.notificationRepo.save({
      recipient: { id: user.id },
      title: 'Suscripción suspendida',
      message: `El acceso de "${organization.name}" fue congelado por falta de pago. Actualiza tu medio de pago para reactivarlo.`,
      type: NOTIFICATION_TYPE,
      link: `/org/${organization.id}/billing`,
      data: { subscriptionId: subscription.id },
    });

    this.eventBus.emit('organization.subscription.suspended', {
      organizationId: organization.id,
      organizationName: organization.name,
      adminEmail: user.email,
    });

    this.logger.log(`[OrgSubscriptionSuspension] organización ${organization.id} notificada como suspendida`);
  }
}
