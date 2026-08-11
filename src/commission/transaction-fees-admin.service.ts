import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../entitlements/entities/plan.entity';
import { SubjectType } from '../entitlements/entities/subject-type.enum';
import { OrganizationType } from '../organizations/entities/organization-type.enum';
import { isCommissionApplicable } from './commission.constants';
import { TransactionFeeConfig } from './entities/transaction-fee-config.entity';
import { TransactionFeeConfigService } from './transaction-fee-config.service';

export interface TransactionFeeView {
  planId: string;
  planKey: string;
  planName: string;
  organizationType: OrganizationType;
  rate: number | null;
  currency: string | null;
  effectiveFrom: Date | null;
  updatedBy: string | null;
  entitlementKey: string;
}

export interface TransactionFeeHistoryView {
  id: string;
  organizationType: OrganizationType;
  rate: number;
  currency: string;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  isActive: boolean;
  changedByUserId: string | null;
  changedByName: string | null;
  createdAt: Date;
}

export interface UpdateTransactionFeeInput {
  planId: string;
  organizationType: OrganizationType;
  rate: number;
  actorUserId?: string | null;
  actorName?: string | null;
}

/**
 * Casos de uso administrativos de la comisión transaccional (§6-§9): consultar,
 * actualizar (versionando), consultar historial y saber quién cambió qué. La
 * autorización (`platform.plans.manage`) y la auditoría de staff las aplica el
 * controller vía guard + `@AuditAction`; aquí van las validaciones de negocio.
 */
@Injectable()
export class TransactionFeesAdminService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    private readonly configService: TransactionFeeConfigService,
  ) {}

  /** GET /admin/plans/transaction-fees — toda la matriz plan × tipo × comisión (§6). */
  async listAll(): Promise<TransactionFeeView[]> {
    const plans = await this.planRepository.find({
      where: { subjectType: SubjectType.ORGANIZATION },
      order: { key: 'ASC' },
    });
    const perPlan = await Promise.all(plans.map((plan) => this.getForPlan(plan.id)));
    return perPlan.flat();
  }

  /** GET /admin/plans/:planId/transaction-fee — tarifa vigente por tipo de organización (§8). */
  async getForPlan(planId: string): Promise<TransactionFeeView[]> {
    const plan = await this.getPlan(planId);
    const entitlement = await this.configService.getTransactionFeeEntitlement();
    const current = await this.configService.listCurrentByPlan(planId);

    const applicableTypes =
      entitlement.appliesToOrganizationTypes ??
      ([OrganizationType.LABEL, OrganizationType.MANAGEMENT] as OrganizationType[]);

    // Una fila por tipo aplicable, aunque aún no exista configuración (§6).
    return applicableTypes.map((organizationType) => {
      const config = current.find((c) => c.organizationType === organizationType);
      return {
        planId: plan.id,
        planKey: plan.key,
        planName: plan.name,
        organizationType,
        rate: config ? Number(config.rate) : null,
        currency: config?.currency ?? null,
        effectiveFrom: config?.effectiveFrom ?? null,
        updatedBy: config?.createdByName ?? null,
        entitlementKey: entitlement.key,
      };
    });
  }

  /** PUT /admin/plans/:planId/transaction-fee — versiona la tarifa (§7/§8/§9). */
  async update(input: UpdateTransactionFeeInput): Promise<TransactionFeeView[]> {
    // §9.3 / §9: solo LABEL y MANAGEMENT; PUBLISHER u otros quedan excluidos.
    if (!isCommissionApplicable(input.organizationType)) {
      throw new BadRequestException(
        `La comisión de marketplace solo aplica a LABEL y MANAGEMENT, no a ${input.organizationType}`,
      );
    }
    // §9.4/§9.5: rango del porcentaje (redundante con el DTO, defensivo en dominio).
    if (input.rate < 0 || input.rate > 100) {
      throw new BadRequestException('El porcentaje debe estar entre 0 y 100');
    }

    await this.getPlan(input.planId); // §9.6: el plan existe.

    await this.configService.setRate({
      planId: input.planId,
      organizationType: input.organizationType,
      rate: input.rate,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
    });

    return this.getForPlan(input.planId);
  }

  /** GET historial de vigencia de un plan (§6 "Consultar historial", §21). */
  async getHistory(
    planId: string,
    organizationType?: OrganizationType,
  ): Promise<TransactionFeeHistoryView[]> {
    await this.getPlan(planId);
    const rows = await this.configService.getHistory(planId, organizationType);
    return rows.map((row: TransactionFeeConfig) => ({
      id: row.id,
      organizationType: row.organizationType,
      rate: Number(row.rate),
      currency: row.currency,
      effectiveFrom: row.effectiveFrom,
      effectiveUntil: row.effectiveUntil ?? null,
      isActive: row.isActive,
      changedByUserId: row.createdByUserId ?? null,
      changedByName: row.createdByName ?? null,
      createdAt: row.createdAt,
    }));
  }

  private async getPlan(planId: string): Promise<Plan> {
    const plan = await this.planRepository.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }
}
