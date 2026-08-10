import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Capability } from 'src/authorization/entities/capability.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { DataSource, In, Repository } from 'typeorm';
import { Entitlement } from './entities/entitlement.entity';
import { EntitlementPeriod } from './entities/entitlement-period.enum';
import { Plan } from './entities/plan.entity';
import { PlanCapability } from './entities/plan-capability.entity';
import { PlanEntitlement } from './entities/plan-entitlement.entity';

export interface UpsertPlanEntitlementParams {
  limit: number | null;
  unlimited: boolean;
  period: EntitlementPeriod;
}

/**
 * Configuración comercial de planes desde el Admin de Musila (§19): la
 * creación de planes/entitlements sigue siendo por seeds versionados; aquí
 * se administran valores (límites, períodos, capabilities incluidas).
 */
@Injectable()
export class PlansAdminService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(PlanEntitlement)
    private readonly planEntitlementRepository: Repository<PlanEntitlement>,
    @InjectRepository(Entitlement)
    private readonly entitlementRepository: Repository<Entitlement>,
    private readonly dataSource: DataSource,
    private readonly eventBus: EventBusService,
  ) {}

  async findAllPlans(): Promise<Plan[]> {
    return this.planRepository.find({
      relations: {
        planCapabilities: { capability: true },
        planEntitlements: { entitlement: true },
      },
      order: { key: 'ASC' },
    });
  }

  async findAllEntitlements(): Promise<Entitlement[]> {
    return this.entitlementRepository.find({ order: { key: 'ASC' } });
  }

  async updatePlan(
    planId: string,
    changes: Partial<Pick<Plan, 'name' | 'description' | 'isActive'>>,
  ): Promise<Plan> {
    const plan = await this.getPlan(planId);
    Object.assign(plan, changes);
    await this.planRepository.save(plan);
    return this.getPlan(planId);
  }

  /** Fija el valor comercial de un entitlement dentro de un plan (crea la fila si no existía). */
  async upsertPlanEntitlement(
    planId: string,
    entitlementId: string,
    params: UpsertPlanEntitlementParams,
  ): Promise<PlanEntitlement> {
    await this.getPlan(planId);
    const entitlement = await this.entitlementRepository.findOne({ where: { id: entitlementId } });
    if (!entitlement) throw new NotFoundException('Entitlement no encontrado');

    if (!params.unlimited && (params.limit === null || params.limit < 0)) {
      throw new BadRequestException('Un entitlement no ilimitado requiere un límite >= 0');
    }

    const existing = await this.planEntitlementRepository.findOne({
      where: { planId, entitlementId },
    });

    const planEntitlement = existing ?? this.planEntitlementRepository.create({ planId, entitlementId });
    planEntitlement.limit = params.unlimited ? null : params.limit;
    planEntitlement.unlimited = params.unlimited;
    planEntitlement.period = params.period;

    return this.planEntitlementRepository.save(planEntitlement);
  }

  /** Reemplaza las capabilities incluidas en el plan (§22: asociar capability a planes). */
  async setPlanCapabilities(planId: string, capabilityIds: string[]): Promise<Plan> {
    await this.getPlan(planId);

    const capabilities = await this.dataSource
      .getRepository(Capability)
      .find({ where: { id: In(capabilityIds) } });
    if (capabilities.length !== capabilityIds.length) {
      throw new BadRequestException('Alguna de las capabilities indicadas no existe');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(PlanCapability, { planId });
      await manager.save(
        capabilityIds.map((capabilityId) =>
          manager.create(PlanCapability, { planId, capabilityId }),
        ),
      );
    });

    // Cambió el contenido de un plan: invalida las capabilities cacheadas de todos los contextos.
    this.eventBus.emit('authorization.capability.updated', { capabilityId: `plan:${planId}` });
    return this.getPlan(planId);
  }

  private async getPlan(planId: string): Promise<Plan> {
    const plan = await this.planRepository.findOne({
      where: { id: planId },
      relations: {
        planCapabilities: { capability: true },
        planEntitlements: { entitlement: true },
      },
    });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }
}
