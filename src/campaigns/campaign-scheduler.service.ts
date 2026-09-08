import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventBusService } from '../shared/events/event-bus.service';
import { Campaign } from './entities/campaign.entity';
import { CampaignStatus } from './entities/campaign-status.enum';
import { CampaignClosedReason } from './entities/campaign-closed-reason.enum';

/**
 * Cierre automático por fecha límite (§CREACIÓN DE CAMPAÑAS, requisito 1 de
 * 2 para "se elimina de la vista"). El cierre por cupo ya ocurre de forma
 * síncrona en `CampaignsService.closeIfQuotaReached`. Nunca borra filas: solo
 * cambia el estado (permanece en el historial del sello).
 */
@Injectable()
export class CampaignSchedulerService {
  private readonly logger = new Logger(CampaignSchedulerService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly eventBus: EventBusService,
  ) {}

  /** Cada 15 minutos: cierra por `UPDATE` condicional las campañas activas cuya fecha límite venció. */
  @Cron('*/15 * * * *')
  async closeExpiredCampaigns(): Promise<void> {
    try {
      const now = new Date();
      const due = await this.campaignRepo.find({
        where: { status: CampaignStatus.ACTIVE },
        select: { id: true, deadline: true, organizationId: true, title: true },
      });
      const expired = due.filter((c) => c.deadline.getTime() <= now.getTime());
      if (expired.length === 0) return;

      for (const campaign of expired) {
        const result = await this.campaignRepo
          .createQueryBuilder()
          .update(Campaign)
          .set({ status: CampaignStatus.CLOSED, closedReason: CampaignClosedReason.DEADLINE, closedAt: now })
          .where('id = :id AND status = :status', { id: campaign.id, status: CampaignStatus.ACTIVE })
          .execute();

        if (result.affected) {
          this.eventBus.emit('campaign.closed', {
            campaignId: campaign.id,
            campaignTitle: campaign.title,
            organizationId: campaign.organizationId ?? null,
            reason: CampaignClosedReason.DEADLINE,
          });
        }
      }

      this.logger.log(`[campaign] ${expired.length} campaña(s) cerradas por fecha límite`);
    } catch (err) {
      this.logger.error(`[campaign] error cerrando campañas vencidas: ${(err as Error)?.message}`);
    }
  }
}
