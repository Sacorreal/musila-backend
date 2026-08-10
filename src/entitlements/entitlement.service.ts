import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entitlement } from './entities/entitlement.entity';
import { EntitlementPeriod } from './entities/entitlement-period.enum';
import { PlanEntitlement } from './entities/plan-entitlement.entity';
import { SubjectType } from './entities/subject-type.enum';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionStatus } from './entities/subscription-status.enum';
import { UsageService, UsageSubject } from './usage.service';

export interface EffectiveEntitlement {
  key: string;
  name: string;
  limit: number | null;
  unlimited: boolean;
  period: EntitlementPeriod;
  consumed: number;
  remaining: number | null;
  subscriptionId: string;
  planKey: string;
}

/**
 * Resuelve los entitlements efectivos de un sujeto a partir de su
 * subscription activa (§7). Regla B2B (§6): para miembros de roster el
 * sujeto es la organización — el caller decide el sujeto según el contexto.
 */
@Injectable()
export class EntitlementService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(PlanEntitlement)
    private readonly planEntitlementRepository: Repository<PlanEntitlement>,
    @InjectRepository(Entitlement)
    private readonly entitlementRepository: Repository<Entitlement>,
    private readonly usageService: UsageService,
  ) {}

  async findActiveSubscription(subject: UsageSubject): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: {
        subjectType: subject.type,
        subjectId: subject.id,
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }

  /**
   * PlanEntitlement vigente de un sujeto para una key. `undefined` cuando el
   * sujeto no tiene subscription o su plan no define ese entitlement — en
   * ese caso no hay cuota que aplicar (la capability ya decidió el acceso).
   */
  async resolvePlanEntitlement(
    subject: UsageSubject,
    entitlementKey: string,
  ): Promise<{ planEntitlement: PlanEntitlement; subscription: Subscription } | undefined> {
    const subscription = await this.findActiveSubscription(subject);
    if (!subscription) return undefined;

    const planEntitlement = await this.planEntitlementRepository.findOne({
      where: {
        planId: subscription.planId,
        entitlement: { key: entitlementKey },
      },
    });

    if (!planEntitlement) return undefined;
    return { planEntitlement, subscription };
  }

  /** Entitlements del sujeto con su consumo y remaining, para las APIs /me y el Explorer. */
  async getEffectiveEntitlements(subject: UsageSubject): Promise<EffectiveEntitlement[]> {
    const subscription = await this.findActiveSubscription(subject);
    if (!subscription) return [];

    const planEntitlements = await this.planEntitlementRepository.find({
      where: { planId: subscription.planId },
    });

    return Promise.all(
      planEntitlements.map(async (planEntitlement) => {
        const periodKey = this.usageService.buildPeriodKey(planEntitlement.period, new Date(), {
          subscriptionId: subscription.id,
          periodStart: subscription.startAt,
        });
        const consumed = await this.usageService.getConsumed(
          subject,
          planEntitlement.entitlement.key,
          periodKey,
        );

        return {
          key: planEntitlement.entitlement.key,
          name: planEntitlement.entitlement.name,
          limit: planEntitlement.unlimited ? null : planEntitlement.limit,
          unlimited: planEntitlement.unlimited,
          period: planEntitlement.period,
          consumed,
          remaining: planEntitlement.unlimited || planEntitlement.limit === null
            ? null
            : Math.max(planEntitlement.limit - consumed, 0),
          subscriptionId: subscription.id,
          planKey: subscription.plan.key,
        };
      }),
    );
  }

  async findEntitlementByKey(key: string): Promise<Entitlement | null> {
    return this.entitlementRepository.findOne({ where: { key } });
  }

  userSubject(userId: string): UsageSubject {
    return { type: SubjectType.USER, id: userId };
  }

  organizationSubject(organizationId: string): UsageSubject {
    return { type: SubjectType.ORGANIZATION, id: organizationId };
  }
}
