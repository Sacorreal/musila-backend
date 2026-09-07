import { Injectable, Logger } from '@nestjs/common';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EmailService } from 'src/shared/mail/services/email.service';
import { ShareResourceType } from '../entities/share-resource-type.enum';
import { SharingService } from '../sharing.service';

const RESOURCE_TYPE_LABELS: Record<ShareResourceType, string> = {
  [ShareResourceType.PROFILE]: 'perfil',
  [ShareResourceType.PLAYLIST]: 'playlist',
  [ShareResourceType.TRACK]: 'track',
};

@Injectable()
export class SharingListener {
  private readonly logger = new Logger(SharingListener.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly sharingService: SharingService,
  ) {}

  @EventListener({ event: 'share.recipient.authorized', channel: 'email' })
  async handleShareRecipientAuthorized(payload: AppEventMap['share.recipient.authorized']) {
    this.logger.log(`Notificando acceso concedido a ${payload.recipientEmail} (share ${payload.shareLinkId})`);

    try {
      const resourceTypeLabel = RESOURCE_TYPE_LABELS[payload.resourceType];
      await this.emailService.sendShareContentEmail(payload.recipientEmail, {
        recipientName: payload.recipientName,
        ownerName: payload.authorizedByName,
        resourceTypeLabel,
        resourceTitle: payload.resourceTitle,
        shareUrl: payload.shareUrl,
        instructionsText: `Inicia sesión en Musila con tu cuenta (@usuario) para acceder a este ${resourceTypeLabel}.`,
      });
    } catch (error) {
      this.logger.error(`Error enviando email de contenido compartido a ${payload.recipientEmail}`, error);
    }
  }

  @EventListener({ event: 'share.access.attempted', channel: 'other' })
  async handleShareAccessAttempted(payload: AppEventMap['share.access.attempted']) {
    try {
      await this.sharingService.persistAccessLog(payload);
    } catch (error) {
      this.logger.error('Error persistiendo el log de auditoría de acceso compartido', error);
    }
  }
}
