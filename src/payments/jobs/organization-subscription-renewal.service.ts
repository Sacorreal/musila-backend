import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { Plan } from 'src/entitlements/entities/plan.entity';
import { PlanPrice } from 'src/entitlements/entities/plan-price.entity';
import { SubjectType } from 'src/entitlements/entities/subject-type.enum';
import { Subscription } from 'src/entitlements/entities/subscription.entity';
import { SubscriptionStatus } from 'src/entitlements/entities/subscription-status.enum';
import { Between, Repository } from 'typeorm';
import { BillingPeriod } from '../entities/payment.entity';
import { OrganizationBillingService } from '../organization-billing.service';

/**
 * Renovación automática de suscripciones B2B vencidas hoy (§Registro Legal
 * B2B, paso 9): intenta cobrar a la tarjeta tokenizada de la organización.
 * Sin tarjeta activa o cobro rechazado → PAST_DUE (inicia el período de
 * gracia de 5 días que vigila `OrganizationSubscriptionSuspensionService`).
 */
@Injectable()
export class OrganizationSubscriptionRenewalService {
  private readonly logger = new Logger(OrganizationSubscriptionRenewalService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(PlanPrice)
    private readonly planPriceRepo: Repository<PlanPrice>,
    private readonly organizationBillingService: OrganizationBillingService,
  ) {}

  /** Corre cada día a las 14:00 UTC, 1h antes del recordatorio (mismo horario que el flujo individual). */
  @Cron('0 14 * * *')
  async handleDailyRenewals() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const dueToday = await this.subscriptionRepo.find({
      where: { subjectType: SubjectType.ORGANIZATION, status: SubscriptionStatus.ACTIVE, endAt: Between(todayStart, todayEnd) },
    });

    this.logger.log(`[OrgSubscriptionRenewal] ${dueToday.length} suscripciones B2B vencen hoy`);

    for (const subscription of dueToday) {
      await this.renew(subscription);
    }
  }

  private async renew(subscription: Subscription) {
    const organization = await this.organizationRepo.findOne({ where: { id: subscription.subjectId } });
    if (!organization) return;

    const activePrice = await this.planPriceRepo.findOne({
      where: {
        planId: subscription.planId,
        currency: 'COP',
        billingPeriod: BillingPeriod.MONTHLY,
        isActive: true,
      },
      order: { effectiveFrom: 'DESC' },
    });

    if (!activePrice) {
      // Plan sin precio (custom/free): no hay cobro automático que intentar,
      // el vencimiento no aplica de la misma forma. Se deja ACTIVE.
      return;
    }

    const charge = await this.organizationBillingService.chargeRecurringForOrganization(
      organization.id,
      activePrice.amountInCents,
      activePrice.currency,
    );

    if (charge?.approved) {
      const days = activePrice.billingPeriod === BillingPeriod.ANNUAL ? 365 : 30;
      const newEndAt = new Date(subscription.endAt ?? new Date());
      newEndAt.setDate(newEndAt.getDate() + days);
      await this.subscriptionRepo.update(subscription.id, { endAt: newEndAt });
      this.logger.log(`[OrgSubscriptionRenewal] organización ${organization.id} renovada hasta ${newEndAt.toISOString()}`);
      return;
    }

    await this.subscriptionRepo.update(subscription.id, { status: SubscriptionStatus.PAST_DUE });
    this.logger.warn(`[OrgSubscriptionRenewal] organización ${organization.id} sin cobro exitoso → PAST_DUE`);
  }
}
