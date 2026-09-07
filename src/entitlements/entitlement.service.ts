import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TransactionFeeConfig } from '../commission/entities/transaction-fee-config.entity';
import {
  CommissionErrorCode,
  MARKETPLACE_TRANSACTION_FEE_KEY,
} from '../commission/commission.constants';
import type { CommissionRate } from '../commission/commission.types';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationType } from '../organizations/entities/organization-type.enum';
import { EventBusService } from '../shared/events/event-bus.service';
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
export class EntitlementService implements OnModuleInit {
  /** Cache de la tarifa vigente por `planId:organizationType` (§25). */
  private readonly transactionFeeCache = new Map<string, TransactionFeeConfig>();

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(PlanEntitlement)
    private readonly planEntitlementRepository: Repository<PlanEntitlement>,
    @InjectRepository(Entitlement)
    private readonly entitlementRepository: Repository<Entitlement>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(TransactionFeeConfig)
    private readonly transactionFeeConfigRepository: Repository<TransactionFeeConfig>,
    private readonly usageService: UsageService,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit(): void {
    // §25: al modificar una tarifa se invalida su entrada cacheada para que las
    // nuevas operaciones resuelvan la tarifa vigente.
    this.eventBus.on('marketplace.transaction_fee.updated', ({ planId, organizationType }) => {
      this.transactionFeeCache.delete(this.transactionFeeCacheKey(planId, organizationType as OrganizationType));
    });
  }

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

  // ─── Comisión transaccional del comprador (§11) ──────────────────────────

  /**
   * Resuelve la tarifa de comisión vigente para una organización compradora
   * (§11):
   *
   *   organizationId → Organization → validar LABEL/MANAGEMENT →
   *   subscription activa → Plan → transaction_fee vigente → rate
   *
   * El tipo de organización se resuelve SIEMPRE contra la BD, nunca desde el
   * request (§23). Nunca aplica `0%` silencioso: si no hay configuración lanza
   * `TRANSACTION_FEE_NOT_CONFIGURED`.
   */
  async getMarketplaceTransactionFee(organizationId: string): Promise<CommissionRate> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException({
        message: 'Organización compradora no encontrada',
        code: CommissionErrorCode.BUYER_ORGANIZATION_NOT_FOUND,
      });
    }

    const entitlement = await this.entitlementRepository.findOne({
      where: { key: MARKETPLACE_TRANSACTION_FEE_KEY },
    });
    if (!entitlement || entitlement.isActive === false) {
      throw new UnprocessableEntityException({
        message: `El entitlement '${MARKETPLACE_TRANSACTION_FEE_KEY}' no está configurado`,
        code: CommissionErrorCode.TRANSACTION_FEE_NOT_CONFIGURED,
      });
    }

    const applicableTypes = entitlement.appliesToOrganizationTypes ?? [];
    if (applicableTypes.length > 0 && !applicableTypes.includes(organization.type)) {
      throw new ForbiddenException({
        message: `El tipo de organización ${organization.type} no admite comisión de marketplace`,
        code: CommissionErrorCode.BUYER_ORGANIZATION_TYPE_NOT_SUPPORTED,
      });
    }

    const subscription = await this.findActiveSubscription(this.organizationSubject(organizationId));
    if (!subscription) {
      throw new UnprocessableEntityException({
        message: 'La organización compradora no tiene una suscripción activa',
        code: CommissionErrorCode.BUYER_SUBSCRIPTION_NOT_FOUND,
      });
    }

    const config = await this.resolveCurrentTransactionFee(subscription.planId, organization.type);
    if (!config) {
      throw new UnprocessableEntityException({
        message: `No hay comisión configurada para el plan ${subscription.plan.key} y el tipo ${organization.type}`,
        code: CommissionErrorCode.TRANSACTION_FEE_NOT_CONFIGURED,
      });
    }

    return {
      rate: Number(config.rate),
      currency: config.currency,
      planId: subscription.planId,
      planKey: subscription.plan.key,
      subscriptionId: subscription.id,
      organizationId,
      organizationType: organization.type,
      entitlementId: entitlement.id,
    };
  }

  /** Fila vigente de tarifa para (plan, tipo), con cache invalidada por evento (§25). */
  private async resolveCurrentTransactionFee(
    planId: string,
    organizationType: OrganizationType,
  ): Promise<TransactionFeeConfig | null> {
    const key = this.transactionFeeCacheKey(planId, organizationType);
    const cached = this.transactionFeeCache.get(key);
    if (cached) return cached;

    const current = await this.transactionFeeConfigRepository.findOne({
      where: { planId, organizationType, isActive: true, effectiveUntil: IsNull() },
    });

    if (current) this.transactionFeeCache.set(key, current);
    return current;
  }

  private transactionFeeCacheKey(planId: string, organizationType: OrganizationType): string {
    return `${planId}:${organizationType}`;
  }
}
