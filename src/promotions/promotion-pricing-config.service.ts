import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { EventBusService } from '../shared/events/event-bus.service';
import { PromotionPricingConfig } from './entities/promotion-pricing-config.entity';
import { PromotionType } from './entities/promotion-type.enum';
import { PROMOTION_CURRENCY } from './promotions.constants';

export interface SetPriceParams {
  type: PromotionType;
  amount: number;
  actorUserId?: string | null;
  actorName?: string | null;
}

export interface SetPriceResult {
  before: PromotionPricingConfig | null;
  after: PromotionPricingConfig;
}

/**
 * Escritura, versionado y lectura del precio por tipo de pauta. Fuente de verdad
 * de `promotion_pricing_config`. Mismo patrón append-only que
 * `TransactionFeeConfigService`: nunca borra historial.
 */
@Injectable()
export class PromotionPricingConfigService {
  constructor(
    @InjectRepository(PromotionPricingConfig)
    private readonly configRepository: Repository<PromotionPricingConfig>,
    private readonly dataSource: DataSource,
    private readonly eventBus: EventBusService,
  ) {}

  /** Precios vigentes de ambos tipos de pauta. */
  async listCurrent(): Promise<PromotionPricingConfig[]> {
    return this.configRepository.find({
      where: { isActive: true, effectiveUntil: IsNull() },
      order: { type: 'ASC' },
    });
  }

  /** Precio vigente de un tipo; lanza si no está configurado. */
  async getCurrent(type: PromotionType): Promise<PromotionPricingConfig> {
    const current = await this.configRepository.findOne({
      where: { type, isActive: true, effectiveUntil: IsNull() },
    });
    if (!current) {
      throw new NotFoundException(`No hay precio configurado para pautas de tipo '${type}'`);
    }
    return current;
  }

  /** Historial de vigencia (append-only), más reciente primero. */
  async getHistory(type?: PromotionType): Promise<PromotionPricingConfig[]> {
    return this.configRepository.find({
      where: { ...(type ? { type } : {}) },
      order: { effectiveFrom: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Aplica un nuevo precio versionando el historial: cierra la fila vigente e
   * inserta una nueva vigente, en una transacción. Emite el evento de cambio.
   */
  async setPrice(params: SetPriceParams): Promise<SetPriceResult> {
    const result = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PromotionPricingConfig);
      const now = new Date();

      const before = await repo.findOne({
        where: { type: params.type, isActive: true, effectiveUntil: IsNull() },
      });

      if (before) {
        before.effectiveUntil = now;
        before.isActive = false;
        await repo.save(before);
      }

      const after = await repo.save(
        repo.create({
          type: params.type,
          amount: params.amount,
          currency: PROMOTION_CURRENCY,
          isActive: true,
          effectiveFrom: now,
          effectiveUntil: null,
          createdByUserId: params.actorUserId ?? null,
          createdByName: params.actorName ?? null,
        }),
      );

      return { before, after };
    });

    this.eventBus.emit('promotion.pricing.updated', {
      type: params.type,
      previousAmount: result.before ? Number(result.before.amount) : null,
      newAmount: Number(result.after.amount),
      configId: result.after.id,
      actorUserId: params.actorUserId ?? null,
    });

    return result;
  }
}
