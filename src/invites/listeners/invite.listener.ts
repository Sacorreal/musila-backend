import { Injectable, Logger } from '@nestjs/common';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EmailService } from 'src/shared/mail/services/email.service';

@Injectable()
export class InviteListener {
  private readonly logger = new Logger(InviteListener.name);

  constructor(private readonly emailService: EmailService) {}

  @EventListener({ event: 'invite.created', channel: 'email' })
  async handleInviteCreated(payload: AppEventMap['invite.created']) {
    this.logger.log(`Procesando evento invite.created para: ${payload.email}`);

    try {
      if (!payload.email) {
        this.logger.warn('La invitación no tiene un email destino. Omitiendo notificación.');
        return;
      }

      await this.emailService.sendInvitationGuestEmail(payload.email, {
        inviterName: payload.invitedByName,
        guestName: payload.guestName,
        UrlInvitationGuest: payload.inviteUrl,
      });

      this.logger.log(`Email de invitación enviado con éxito a ${payload.email}`);
    } catch (error) {
      this.logger.error(`Error al enviar email de invitación a ${payload.email}`, error);
    }
  }
}
