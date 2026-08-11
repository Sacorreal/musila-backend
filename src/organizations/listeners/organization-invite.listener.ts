import { Injectable, Logger } from '@nestjs/common';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { EmailService } from 'src/shared/mail/services/email.service';

/**
 * Notificaciones por email del alta del Organization Admin inicial: correo de
 * invitación (registro) cuando aún no tiene cuenta, o de asignación cuando ya
 * era usuario de Musila.
 */
@Injectable()
export class OrganizationInviteListener {
  private readonly logger = new Logger(OrganizationInviteListener.name);

  constructor(private readonly emailService: EmailService) {}

  @EventListener({ event: 'organization.admin.invited', channel: 'email' })
  async handleAdminInvited(payload: AppEventMap['organization.admin.invited']) {
    try {
      await this.emailService.sendOrganizationAdminInviteEmail(payload.email, {
        adminName: payload.adminName ?? '',
        organizationName: payload.organizationName,
        inviteUrl: payload.inviteUrl,
      });
      this.logger.log(`Invitación de Organization Admin enviada a ${payload.email}`);
    } catch (error) {
      this.logger.error(`Error al enviar invitación de Organization Admin a ${payload.email}`, error);
    }
  }

  @EventListener({ event: 'organization.admin.assigned', channel: 'email' })
  async handleAdminAssigned(payload: AppEventMap['organization.admin.assigned']) {
    try {
      await this.emailService.sendOrganizationAdminAssignedEmail(payload.email, {
        adminName: payload.name,
        organizationName: payload.organizationName,
        workspaceUrl: payload.workspaceUrl,
      });
      this.logger.log(`Notificación de asignación de Organization Admin enviada a ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Error al enviar notificación de asignación a ${payload.email}`,
        error,
      );
    }
  }
}
