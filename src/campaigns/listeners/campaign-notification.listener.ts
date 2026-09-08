import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { EventListener } from '../../shared/events/decorators/event-listener.decorator';
import {
  AppEventMap,
  CampaignSubmissionEventPayload,
} from '../../shared/events/contracts/app-event-map';
import { User } from '../../users/entities/user.entity';
import { OrganizationMembership } from '../../organizations/entities/organization-membership.entity';
import { MembershipStatus } from '../../organizations/entities/membership-status.enum';

/**
 * Notificaciones in-app del ciclo de vida de una postulación a campaña: al
 * sello cuando llega una nueva, al compositor cuando su postulación se
 * aprueba o descarta. Calcado de `PromotionNotificationListener`.
 */
@Injectable()
export class CampaignNotificationListener {
  private readonly logger = new Logger(CampaignNotificationListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepo: Repository<OrganizationMembership>,
  ) {}

  @EventListener({ event: 'campaign.submission.received', channel: 'in-app' })
  async onSubmissionReceived(payload: AppEventMap['campaign.submission.received']) {
    try {
      const recipientIds = payload.organizationId
        ? (
            await this.membershipRepo.find({
              where: { organizationId: payload.organizationId, status: MembershipStatus.ACTIVE },
              select: { userId: true },
            })
          ).map((m) => m.userId)
        : [payload.ownerUserId];

      const link = payload.organizationId
        ? `/org/${payload.organizationId}/campanas/${payload.campaignId}`
        : `/campaigns/mine`;

      await this.dispatch(
        recipientIds,
        'Nueva postulación a tu campaña',
        `"${payload.trackTitle}" se postuló a la campaña "${payload.campaignTitle}".`,
        'campaign.submission.received',
        link,
        payload,
      );
    } catch (err) {
      this.logger.error(`Error notificando nueva postulación: ${(err as Error)?.message}`);
    }
  }

  @EventListener({ event: 'campaign.submission.selected', channel: 'in-app' })
  async onSubmissionSelected(payload: AppEventMap['campaign.submission.selected']) {
    await this.notifyComposer(
      payload,
      'Tu postulación fue seleccionada',
      `"${payload.trackTitle}" fue seleccionada en la campaña "${payload.campaignTitle}". Continúa el proceso de licenciamiento.`,
      'campaign.submission.selected',
    );
  }

  @EventListener({ event: 'campaign.submission.discarded', channel: 'in-app' })
  async onSubmissionDiscarded(payload: AppEventMap['campaign.submission.discarded']) {
    await this.notifyComposer(
      payload,
      'Tu postulación fue descartada',
      `"${payload.trackTitle}" no fue seleccionada en la campaña "${payload.campaignTitle}".`,
      'campaign.submission.discarded',
    );
  }

  private async notifyComposer(
    payload: CampaignSubmissionEventPayload,
    title: string,
    message: string,
    type: string,
  ) {
    try {
      await this.dispatch([payload.composerId], title, message, type, '/campaigns/mine', payload);
    } catch (err) {
      this.logger.error(`Error notificando compositor (${type}): ${(err as Error)?.message}`);
    }
  }

  private async dispatch(
    userIds: string[],
    title: string,
    message: string,
    type: string,
    link: string,
    payload: CampaignSubmissionEventPayload,
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
