import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { EmailService } from 'src/shared/mail/services/email.service';

/**
 * Emails del ciclo de vida de onboarding B2B (§Registro Legal B2B): notifica
 * a la organización en cada cambio de estado, indicando el siguiente paso a
 * seguir (requisito explícito de la NOTA del requerimiento).
 */
@Injectable()
export class OrganizationRegistrationEmailListener {
  private readonly logger = new Logger(OrganizationRegistrationEmailListener.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  @EventListener({ event: 'organization.registration.submitted', channel: 'email' })
  async onSubmitted(payload: AppEventMap['organization.registration.submitted']) {
    await this.safeSend(payload.adminEmail, () =>
      this.emailService.sendBusinessRegistrationReceivedEmail(payload.adminEmail, {
        legalName: payload.organizationName,
        statusUrl: `${this.webAppBaseUrl()}/business-registration/status`,
      }),
    );
  }

  @EventListener({ event: 'organization.registration.approved', channel: 'email' })
  async onApproved(payload: AppEventMap['organization.registration.approved']) {
    await this.safeSend(payload.adminEmail, () =>
      this.emailService.sendBusinessRegistrationApprovedEmail(payload.adminEmail, {
        legalName: payload.organizationName,
        planName: payload.planName,
        paymentLinkUrl: payload.paymentLinkUrl,
      }),
    );
  }

  @EventListener({ event: 'organization.registration.rejected', channel: 'email' })
  async onRejected(payload: AppEventMap['organization.registration.rejected']) {
    await this.safeSend(payload.adminEmail, () =>
      this.emailService.sendBusinessRegistrationRejectedEmail(payload.adminEmail, {
        legalName: payload.organizationName,
        reason: payload.reason,
      }),
    );
  }

  @EventListener({ event: 'organization.registration.created', channel: 'email' })
  async onCreated(payload: AppEventMap['organization.registration.created']) {
    await this.safeSend(payload.adminEmail, () =>
      this.emailService.sendBusinessRegistrationCreatedEmail(payload.adminEmail, {
        legalName: payload.organizationName,
        activateUrl: `${this.webAppBaseUrl()}/org/${payload.organizationId}/activate`,
      }),
    );
  }

  @EventListener({ event: 'organization.registration.verified', channel: 'email' })
  async onVerified(payload: AppEventMap['organization.registration.verified']) {
    await this.safeSend(payload.adminEmail, () =>
      this.emailService.sendBusinessRegistrationVerifiedEmail(payload.adminEmail, {
        legalName: payload.organizationName,
        planName: payload.planName,
        workspaceUrl: `${this.webAppBaseUrl()}/org/${payload.organizationId}`,
      }),
    );
  }

  @EventListener({ event: 'organization.subscription.reminder', channel: 'email' })
  async onSubscriptionReminder(payload: AppEventMap['organization.subscription.reminder']) {
    await this.safeSend(payload.adminEmail, () =>
      this.emailService.sendBusinessSubscriptionReminderEmail(payload.adminEmail, {
        legalName: payload.organizationName,
        daysRemaining: payload.daysRemaining,
        dueDate: payload.dueDate.toLocaleDateString('es-CO', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        billingUrl: `${this.webAppBaseUrl()}/org/${payload.organizationId}/billing`,
      }),
    );
  }

  @EventListener({ event: 'organization.subscription.suspended', channel: 'email' })
  async onSubscriptionSuspended(payload: AppEventMap['organization.subscription.suspended']) {
    await this.safeSend(payload.adminEmail, () =>
      this.emailService.sendBusinessSubscriptionSuspendedEmail(payload.adminEmail, {
        legalName: payload.organizationName,
        billingUrl: `${this.webAppBaseUrl()}/org/${payload.organizationId}/billing`,
      }),
    );
  }

  private async safeSend(to: string, send: () => Promise<void>): Promise<void> {
    try {
      await send();
    } catch (error) {
      this.logger.error(`Error enviando email de registro B2B a ${to}`, error as Error);
    }
  }

  private webAppBaseUrl(): string {
    return (
      this.configService.get<string>('WEB_APP_DEVELOPMENT') ||
      this.configService.get<string>('WEB_APP_PRODUCTION') ||
      this.configService.get<string>('WEB_APP_LOCAL') ||
      ''
    );
  }
}
