import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { EventBusService } from '../shared/events/event-bus.service';
import { FeaturedService } from './featured.service';
import { PromotionSlotService } from './promotion-slot.service';
import { Promotion } from './entities/promotion.entity';
import { PromotionStatus } from './entities/promotion-status.enum';
import { PromotionType } from './entities/promotion-type.enum';
import { PROMOTION_REVIEW_SLA_HOURS } from './promotions.constants';

/**
 * Procesos programados del ciclo de vida de las pautas (requerimiento §USER
 * FLOWS 2): activación cuando hay cupo, expiración a los 15 días y recordatorio
 * de SLA al administrador. Cada cron aísla sus errores con logging para que un
 * fallo no bloquee el resto (§Flow 2 Error).
 */
@Injectable()
export class PromotionSchedulerService {
  private readonly logger = new Logger(PromotionSchedulerService.name);

  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepo: Repository<Promotion>,
    private readonly slotService: PromotionSlotService,
    private readonly featuredService: FeaturedService,
    private readonly eventBus: EventBusService,
  ) {}

  /** Cada hora: publica las pautas programadas cuya fecha llegó y hay cupo. */
  @Cron('0 * * * *')
  async activateScheduled(): Promise<void> {
    const now = new Date();
    let activatedAny = false;

    for (const type of Object.values(PromotionType)) {
      try {
        const available = await this.slotService.availableSlots(type);
        if (available <= 0) continue;

        const due = await this.slotService.findDueScheduled(type, now);
        const toActivate = due.slice(0, available);

        for (const promotion of toActivate) {
          const result = await this.promotionRepo
            .createQueryBuilder()
            .update(Promotion)
            .set({ status: PromotionStatus.ACTIVE })
            .where('id = :id AND status = :status', {
              id: promotion.id,
              status: PromotionStatus.SCHEDULED,
            })
            .execute();

          if (result.affected) {
            activatedAny = true;
            this.logger.log(`[promotion] activada ${promotion.id} (${type})`);
            this.eventBus.emit('promotion.activated', {
              promotionId: promotion.id,
              type: promotion.type,
              targetId: promotion.targetId,
              organizationId: promotion.organizationId,
              requesterId: promotion.requestedByUserId,
              status: PromotionStatus.ACTIVE,
              resourceTitle: 'tu recurso',
              rejectionReason: null,
              startsAt: promotion.startsAt ?? null,
              expiresAt: promotion.expiresAt ?? null,
            });
          }
        }
      } catch (err) {
        this.logger.error(
          `[promotion] error activando pautas ${type}: ${(err as Error)?.message}`,
        );
      }
    }

    if (activatedAny) this.featuredService.invalidate();
  }

  /** Diario 00:30: expira las pautas activas cuyo plazo de 15 días venció. */
  @Cron('30 0 * * *')
  async expirePromotions(): Promise<void> {
    try {
      const now = new Date();
      const result = await this.promotionRepo
        .createQueryBuilder()
        .update(Promotion)
        .set({ status: PromotionStatus.EXPIRED })
        .where('status = :status AND expires_at <= :now', {
          status: PromotionStatus.ACTIVE,
          now,
        })
        .execute();

      if (result.affected) {
        this.logger.log(`[promotion] ${result.affected} pautas expiradas`);
        this.featuredService.invalidate();
      }
    } catch (err) {
      this.logger.error(`[promotion] error expirando pautas: ${(err as Error)?.message}`);
    }
  }

  /** Diario 13:00 UTC: escala al admin las solicitudes en revisión vencidas de SLA. */
  @Cron('0 13 * * *')
  async remindAdminSla(): Promise<void> {
    try {
      const threshold = new Date(Date.now() - PROMOTION_REVIEW_SLA_HOURS * 60 * 60 * 1000);
      const stale = await this.promotionRepo.find({
        where: { status: PromotionStatus.IN_REVIEW, updatedAt: LessThan(threshold) },
        order: { updatedAt: 'ASC' },
      });

      for (const promotion of stale) {
        this.eventBus.emit('promotion.sla.pending', {
          promotionId: promotion.id,
          type: promotion.type,
          targetId: promotion.targetId,
          organizationId: promotion.organizationId,
          requesterId: promotion.requestedByUserId,
          status: promotion.status,
          resourceTitle: 'una pauta',
          rejectionReason: null,
          startsAt: promotion.startsAt ?? null,
          expiresAt: promotion.expiresAt ?? null,
        });
      }

      if (stale.length) {
        this.logger.warn(`[promotion] ${stale.length} solicitudes con SLA vencido`);
      }
    } catch (err) {
      this.logger.error(`[promotion] error en recordatorio SLA: ${(err as Error)?.message}`);
    }
  }
}
