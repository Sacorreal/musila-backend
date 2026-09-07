import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import { User } from 'src/users/entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { Plan } from './entities/plan.entity';
import { SubjectType } from './entities/subject-type.enum';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionStatus } from './entities/subscription-status.enum';

const PLAN_TYPE_TO_BASE_KEY: Partial<Record<UserPlanType, string>> = {
  [UserPlanType.PLAN_AUTOR]: 'AUTOR',
  [UserPlanType.PLAN_360]: '360',
  [UserPlanType.PLAN_DESCUBRIDOR]: 'DESCUBRIDOR',
};

/**
 * Doble escritura durante la convivencia (D3 del plan): las columnas
 * denormalizadas de `users` siguen siendo la fuente que escribe payments; a
 * partir de ellas este servicio mantiene coherente la Subscription del motor
 * de autorización. Mismo mapping que la migración 1788500000000.
 */
@Injectable()
export class UserPlanSubscriptionSyncService {
  private readonly logger = new Logger(UserPlanSubscriptionSyncService.name);

  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly dataSource: DataSource,
    private readonly eventBus: EventBusService,
  ) {}

  async syncFromUser(userId: string): Promise<void> {
    const user = await this.dataSource.getRepository(User).findOne({ where: { id: userId } });
    if (!user) return;

    const planKey = this.resolvePlanKey(user);
    const active = await this.subscriptionRepository.findOne({
      where: { subjectType: SubjectType.USER, subjectId: userId, status: SubscriptionStatus.ACTIVE },
    });

    if (!planKey) {
      if (active) {
        active.status = SubscriptionStatus.CANCELED;
        active.endAt = new Date();
        await this.subscriptionRepository.save(active);
        this.emitUpdated(userId);
      }
      return;
    }

    const endAt = this.resolveEndAt(user);

    if (active && active.plan.key === planKey) {
      if ((active.endAt?.getTime() ?? null) !== (endAt?.getTime() ?? null)) {
        active.endAt = endAt;
        await this.subscriptionRepository.save(active);
        this.emitUpdated(userId);
      }
      return;
    }

    const plan = await this.planRepository.findOne({ where: { key: planKey } });
    if (!plan) {
      this.logger.warn(`Plan '${planKey}' no encontrado; ejecuta los seeds de autorización`);
      return;
    }

    if (active) {
      active.status = SubscriptionStatus.CANCELED;
      active.endAt = new Date();
      await this.subscriptionRepository.save(active);
    }

    await this.subscriptionRepository.save(
      this.subscriptionRepository.create({
        subjectType: SubjectType.USER,
        subjectId: userId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        startAt: new Date(),
        endAt,
      }),
    );

    this.emitUpdated(userId);
  }

  private resolvePlanKey(user: User): string | undefined {
    const baseKey = PLAN_TYPE_TO_BASE_KEY[user.planType];
    if (!baseKey) return undefined;

    const isPremium =
      user.plan === UserPlan.PRO &&
      (!user.planExpiresAt || user.planExpiresAt > new Date());

    return `${baseKey}_${isPremium ? 'PREMIUM' : 'FREE'}`;
  }

  private resolveEndAt(user: User): Date | null {
    const isPremium =
      user.plan === UserPlan.PRO &&
      (!user.planExpiresAt || user.planExpiresAt > new Date());
    return isPremium ? (user.planExpiresAt ?? null) : null;
  }

  private emitUpdated(userId: string): void {
    this.eventBus.emit('authorization.subscription.updated', {
      subjectType: SubjectType.USER,
      subjectId: userId,
    });
  }
}
