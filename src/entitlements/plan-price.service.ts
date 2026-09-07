import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { BillingPeriod } from 'src/payments/entities/payment.entity';
import { Plan } from './entities/plan.entity';
import { PlanPrice } from './entities/plan-price.entity';

export interface SetPlanPriceInput {
  planId: string;
  currency: string;
  amountInCents: number;
  billingPeriod: BillingPeriod;
  actorUserId?: string | null;
}

/**
 * Precio configurable por el admin de Musila (§Registro Legal B2B, paso 3).
 * Mismo patrón de versionado que `TransactionFeeConfigService`: cierra la
 * fila vigente e inserta una nueva, sin borrar historial.
 */
@Injectable()
export class PlanPriceService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(PlanPrice)
    private readonly planPriceRepository: Repository<PlanPrice>,
    private readonly dataSource: DataSource,
  ) {}

  /** Fila vigente por moneda/período (todas las combinaciones que tengan al menos una fila). */
  async getForPlan(planId: string): Promise<PlanPrice[]> {
    await this.getPlan(planId);
    return this.planPriceRepository.find({
      where: { planId, isActive: true, effectiveUntil: IsNull() },
      order: { currency: 'ASC', billingPeriod: 'ASC' },
    });
  }

  async getHistory(planId: string): Promise<PlanPrice[]> {
    await this.getPlan(planId);
    return this.planPriceRepository.find({
      where: { planId },
      order: { effectiveFrom: 'DESC', createdAt: 'DESC' },
    });
  }

  async setPrice(input: SetPlanPriceInput): Promise<PlanPrice> {
    await this.getPlan(input.planId);

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PlanPrice);
      const now = new Date();

      const current = await repo.findOne({
        where: {
          planId: input.planId,
          currency: input.currency,
          billingPeriod: input.billingPeriod,
          isActive: true,
          effectiveUntil: IsNull(),
        },
      });

      if (current) {
        current.effectiveUntil = now;
        current.isActive = false;
        await repo.save(current);
      }

      return repo.save(
        repo.create({
          planId: input.planId,
          currency: input.currency,
          amountInCents: input.amountInCents,
          billingPeriod: input.billingPeriod,
          isActive: true,
          effectiveFrom: now,
          effectiveUntil: null,
          createdByUserId: input.actorUserId ?? null,
        }),
      );
    });
  }

  private async getPlan(planId: string): Promise<Plan> {
    const plan = await this.planRepository.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }
}
