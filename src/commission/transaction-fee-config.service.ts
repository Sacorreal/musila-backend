import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Entitlement } from '../entitlements/entities/entitlement.entity';
import { EventBusService } from '../shared/events/event-bus.service';
import { OrganizationType } from '../organizations/entities/organization-type.enum';
import {
  COMMISSION_CURRENCY,
  MARKETPLACE_TRANSACTION_FEE_KEY,
} from './commission.constants';
import { TransactionFeeConfig } from './entities/transaction-fee-config.entity';

export interface SetRateParams {
  planId: string;
  organizationType: OrganizationType;
  rate: number;
  actorUserId?: string | null;
  actorName?: string | null;
}

export interface SetRateResult {
  before: TransactionFeeConfig | null;
  after: TransactionFeeConfig;
}

/**
 * Escritura, versionado y lectura administrativa de `transaction_fee_config`:
 * la fuente de verdad del porcentaje por (plan, tipo de organización) y de su
 * historial (§21). La resolución en caliente (con cache) para nuevas
 * operaciones vive en `EntitlementService.getMarketplaceTransactionFee`, que se
 * invalida por el evento `marketplace.transaction_fee.updated` (§25).
 */
@Injectable()
export class TransactionFeeConfigService {
  constructor(
    @InjectRepository(TransactionFeeConfig)
    private readonly configRepository: Repository<TransactionFeeConfig>,
    @InjectRepository(Entitlement)
    private readonly entitlementRepository: Repository<Entitlement>,
    private readonly dataSource: DataSource,
    private readonly eventBus: EventBusService,
  ) {}

  /** Configuración vigente de un plan para ambos tipos de organización (§6). */
  async listCurrentByPlan(planId: string): Promise<TransactionFeeConfig[]> {
    return this.configRepository.find({
      where: { planId, isActive: true, effectiveUntil: IsNull() },
      order: { organizationType: 'ASC' },
    });
  }

  /** Historial completo (append-only) de una combinación, más reciente primero (§20/§21). */
  async getHistory(
    planId: string,
    organizationType?: OrganizationType,
  ): Promise<TransactionFeeConfig[]> {
    return this.configRepository.find({
      where: { planId, ...(organizationType ? { organizationType } : {}) },
      order: { effectiveFrom: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Aplica una nueva tarifa versionando el historial: cierra la fila vigente
   * (effectiveUntil = now, isActive = false) e inserta una nueva vigente. Nunca
   * borra historial. Devuelve el antes/después para la auditoría (§20).
   */
  async setRate(params: SetRateParams): Promise<SetRateResult> {
    const entitlement = await this.getTransactionFeeEntitlement();

    const result = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(TransactionFeeConfig);
      const now = new Date();

      const before = await repo.findOne({
        where: {
          planId: params.planId,
          organizationType: params.organizationType,
          isActive: true,
          effectiveUntil: IsNull(),
        },
      });

      if (before) {
        before.effectiveUntil = now;
        before.isActive = false;
        await repo.save(before);
      }

      const after = await repo.save(
        repo.create({
          planId: params.planId,
          entitlementId: entitlement.id,
          organizationType: params.organizationType,
          rate: params.rate,
          currency: COMMISSION_CURRENCY,
          isActive: true,
          effectiveFrom: now,
          effectiveUntil: null,
          createdByUserId: params.actorUserId ?? null,
          createdByName: params.actorName ?? null,
        }),
      );

      return { before, after };
    });

    // §24/§25: notifica el cambio para invalidar la tarifa cacheada; las nuevas
    // operaciones resolverán la tarifa vigente.
    this.eventBus.emit('marketplace.transaction_fee.updated', {
      planId: params.planId,
      organizationType: params.organizationType,
      previousRate: result.before ? Number(result.before.rate) : null,
      newRate: Number(result.after.rate),
      configId: result.after.id,
      entitlementId: entitlement.id,
      actorUserId: params.actorUserId ?? null,
    });

    return result;
  }

  /** Definición de catálogo del entitlement `marketplace.transaction_fee` (§2/§9). */
  async getTransactionFeeEntitlement(): Promise<Entitlement> {
    const entitlement = await this.entitlementRepository.findOne({
      where: { key: MARKETPLACE_TRANSACTION_FEE_KEY },
    });
    if (!entitlement) {
      throw new NotFoundException(
        `El entitlement '${MARKETPLACE_TRANSACTION_FEE_KEY}' no está configurado`,
      );
    }
    return entitlement;
  }
}
