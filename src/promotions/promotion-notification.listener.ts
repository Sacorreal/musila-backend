import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { EventListener } from '../shared/events/decorators/event-listener.decorator';
import {
  AppEventMap,
  PromotionEventPayload,
} from '../shared/events/contracts/app-event-map';
import { User } from '../users/entities/user.entity';
import { Track } from '../tracks/entities/track.entity';
import { UserPlanType } from '../users/entities/user-plan-type.enum';
import { PromotionType } from './entities/promotion-type.enum';

/**
 * Notificaciones in-app y en tiempo real del ciclo de vida de las pautas
 * (requerimiento §NOTIFICACIONES): al compositor (pautada/aprobada/rechazada/
 * publicada) y al admin (nueva solicitud, SLA por vencer). Vive en el módulo de
 * pautas por cohesión; usa `NotificationsService`/`Gateway` compartidos.
 */
@Injectable()
export class PromotionNotificationListener {
  private readonly logger = new Logger(PromotionNotificationListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Track)
    private readonly trackRepo: Repository<Track>,
  ) {}

  @EventListener({ event: 'promotion.submitted', channel: 'in-app' })
  async onSubmitted(payload: AppEventMap['promotion.submitted']) {
    await this.notifyAdmins(
      'Nueva solicitud de pauta',
      `Se recibió una nueva pauta de tipo ${this.typeLabel(payload.type)} pendiente de revisión.`,
      'promotion.submitted',
      '/admin/promotions',
      payload,
    );
  }

  @EventListener({ event: 'promotion.sla.pending', channel: 'in-app' })
  async onSlaPending(payload: AppEventMap['promotion.sla.pending']) {
    await this.notifyAdmins(
      'Pauta pendiente de revisión (SLA por vencer)',
      'Hay una solicitud de pauta esperando revisión más allá del tiempo esperado.',
      'promotion.sla.pending',
      '/admin/promotions',
      payload,
    );
  }

  @EventListener({ event: 'promotion.approved', channel: 'in-app' })
  async onApproved(payload: AppEventMap['promotion.approved']) {
    await this.notifyCreators(
      payload,
      'Tu pauta fue aprobada',
      `La pauta de "${payload.resourceTitle}" fue aprobada y se publicará próximamente.`,
      'promotion.approved',
    );
  }

  @EventListener({ event: 'promotion.rejected', channel: 'in-app' })
  async onRejected(payload: AppEventMap['promotion.rejected']) {
    const reason = payload.rejectionReason ? ` Motivo: ${payload.rejectionReason}` : '';
    await this.notifyCreators(
      payload,
      'Tu pauta fue rechazada',
      `La pauta de "${payload.resourceTitle}" fue rechazada.${reason}`,
      'promotion.rejected',
    );
  }

  @EventListener({ event: 'promotion.activated', channel: 'in-app' })
  async onActivated(payload: AppEventMap['promotion.activated']) {
    await this.notifyCreators(
      payload,
      'Tu pauta está publicada',
      `La pauta de "${payload.resourceTitle}" ya está visible en los destacados.`,
      'promotion.activated',
    );
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private typeLabel(type: string): string {
    return type === PromotionType.TRACK ? 'track' : 'compositor';
  }

  /** Notifica a todos los usuarios con plan administrativo. */
  private async notifyAdmins(
    title: string,
    message: string,
    type: string,
    link: string,
    payload: PromotionEventPayload,
  ) {
    try {
      const admins = await this.userRepo.find({
        where: { planType: In([UserPlanType.SUPERADMIN, UserPlanType.ADMIN]) },
        select: { id: true },
      });
      await this.dispatch(admins.map((a) => a.id), title, message, type, link, payload);
    } catch (err) {
      this.logger.error(`Error notificando admins (${type}): ${(err as Error)?.message}`);
    }
  }

  /** Notifica al solicitante y al compositor (o autores del track). */
  private async notifyCreators(
    payload: PromotionEventPayload,
    title: string,
    message: string,
    type: string,
  ) {
    try {
      const recipients = new Set<string>([payload.requesterId]);

      if (payload.type === PromotionType.COMPOSER) {
        recipients.add(payload.targetId);
      } else {
        const track = await this.trackRepo.findOne({
          where: { id: payload.targetId },
          relations: ['authors'],
        });
        for (const author of track?.authors ?? []) recipients.add(author.id);
      }

      await this.dispatch([...recipients], title, message, type, '/org', payload);
    } catch (err) {
      this.logger.error(`Error notificando creadores (${type}): ${(err as Error)?.message}`);
    }
  }

  private async dispatch(
    userIds: string[],
    title: string,
    message: string,
    type: string,
    link: string,
    payload: PromotionEventPayload,
  ) {
    for (const userId of userIds) {
      if (!userId) continue;
      const notification = await this.notificationsService.createNotification({
        recipient: { id: userId } as User,
        title,
        message,
        type,
        link,
        data: payload as unknown as Record<string, unknown>,
      });
      this.notificationsGateway.emitToUser(userId, 'notification.received', notification);
    }
  }
}
