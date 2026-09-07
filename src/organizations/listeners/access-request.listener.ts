import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { EmailService } from 'src/shared/mail/services/email.service';

/** Reintentos del envío de email de aprobación (§ Flow 4). */
const MAX_EMAIL_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 500;

/**
 * Notificación por email al usuario cuyo acceso al workspace fue aprobado, con
 * su rol y el resumen legible de funciones. Reintenta hasta tres veces; el
 * acceso permanece activo aunque el email falle definitivamente.
 */
@Injectable()
export class AccessRequestListener {
  private readonly logger = new Logger(AccessRequestListener.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  @EventListener({ event: 'organization.access_request.approved', channel: 'email' })
  async handleAccessApproved(payload: AppEventMap['organization.access_request.approved']) {
    const abilitiesText = payload.capabilities
      .map((capability) => `• ${capability.name}: ${capability.description}`)
      .join('\n');
    const workspaceUrl = `${this.webAppBaseUrl()}/org/${payload.organizationId}`;

    for (let attempt = 1; attempt <= MAX_EMAIL_ATTEMPTS; attempt++) {
      try {
        await this.emailService.sendOrganizationAccessApprovedEmail(payload.email, {
          recipientName: payload.recipientName,
          organizationName: payload.organizationName,
          roleName: payload.roleName,
          abilitiesText,
          workspaceUrl,
        });
        this.logger.log(`Email de acceso aprobado enviado a ${payload.email}`);
        return;
      } catch (error) {
        this.logger.error(
          `Intento ${attempt}/${MAX_EMAIL_ATTEMPTS} fallido al enviar email de acceso aprobado a ${payload.email}`,
          error,
        );
        if (attempt < MAX_EMAIL_ATTEMPTS) {
          await this.delay(RETRY_BACKOFF_MS * attempt);
        }
      }
    }

    this.logger.error(
      `No se pudo enviar el email de acceso aprobado a ${payload.email} tras ${MAX_EMAIL_ATTEMPTS} intentos; el acceso permanece activo.`,
    );
  }

  private webAppBaseUrl(): string {
    return (
      this.configService.get<string>('WEB_APP_DEVELOPMENT') ||
      this.configService.get<string>('WEB_APP_PRODUCTION') ||
      this.configService.get<string>('WEB_APP_LOCAL') ||
      ''
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
