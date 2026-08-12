import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { PromotionStatus } from './entities/promotion-status.enum';
import { PromotionType } from './entities/promotion-type.enum';
import { PROMOTION_DURATION_DAYS, PROMOTION_SLOTS } from './promotions.constants';

export interface SchedulePreview {
  /** Fecha estimada/real de inicio de publicación. */
  startsAt: Date;
  /** Fecha de expiración = startsAt + 15 días. */
  expiresAt: Date;
  /** ¿Había cupo libre (publica al día siguiente) o entra en cola? */
  hasCupo: boolean;
}

/**
 * Lógica de "cupo" de pautas activas por tipo (capacidad de display: 10 tracks /
 * 5 compositores). Si hay cupo, la pauta se publica al día siguiente; si no,
 * se programa para cuando expire la pauta activa más antigua del mismo tipo
 * (requerimiento §USER FLOWS 1.3).
 */
@Injectable()
export class PromotionSlotService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepo: Repository<Promotion>,
  ) {}

  /** Nº máximo de pautas activas simultáneas del tipo. */
  maxSlots(type: PromotionType): number {
    return PROMOTION_SLOTS[type];
  }

  /** Pautas actualmente activas del tipo. */
  async activeCount(type: PromotionType): Promise<number> {
    return this.promotionRepo.count({ where: { type, status: PromotionStatus.ACTIVE } });
  }

  /** Slots libres del tipo en este momento (>= 0). */
  async availableSlots(type: PromotionType): Promise<number> {
    const active = await this.activeCount(type);
    return Math.max(0, this.maxSlots(type) - active);
  }

  /** Suma `days` días a `date` devolviendo una fecha nueva. */
  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  /** Mañana a las 00:00 (hora del servidor). */
  private startOfTomorrow(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return this.addDays(d, 1);
  }

  /**
   * Calcula cuándo se publicaría una pauta del tipo dado:
   * - si hay cupo libre → mañana.
   * - si no → cuando expire la pauta activa más antigua (próxima vacante).
   * `expiresAt` siempre es `startsAt + 15 días`.
   */
  async previewSchedule(type: PromotionType): Promise<SchedulePreview> {
    const available = await this.availableSlots(type);

    if (available > 0) {
      const startsAt = this.startOfTomorrow();
      return { startsAt, expiresAt: this.addDays(startsAt, PROMOTION_DURATION_DAYS), hasCupo: true };
    }

    const oldest = await this.promotionRepo.findOne({
      where: { type, status: PromotionStatus.ACTIVE },
      order: { expiresAt: 'ASC' },
    });

    const startsAt = oldest?.expiresAt ? new Date(oldest.expiresAt) : this.startOfTomorrow();
    return { startsAt, expiresAt: this.addDays(startsAt, PROMOTION_DURATION_DAYS), hasCupo: false };
  }

  /** IDs de pautas SCHEDULED listas para activarse (startsAt <= now), más antiguas primero. */
  async findDueScheduled(type: PromotionType, now: Date): Promise<Promotion[]> {
    return this.promotionRepo.find({
      where: { type, status: PromotionStatus.SCHEDULED, startsAt: LessThanOrEqual(now) },
      order: { startsAt: 'ASC', createdAt: 'ASC' },
    });
  }
}
