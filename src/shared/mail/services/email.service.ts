import { EMAIL_CONFIG } from '../constants/email.constants';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import {
  EmailTemplateMap,
  SendEmailOptions,
} from '../interfaces/email.interface';
import type { EmailConfig } from '../interfaces/email.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;

  constructor(@Inject(EMAIL_CONFIG) private readonly config: EmailConfig) {
    this.resend = new Resend(this.config.apiKey);
  }

  async sendEmail<T extends keyof EmailTemplateMap>(
    options: SendEmailOptions<T>,
  ): Promise<void> {
    try {
      const { to, subject, templateId, variables } = options;

      await this.resend.emails.send({
        from: this.config.defaultFrom || 'no-reply@tuapp.com',
        to,
        subject,
        template: {
          id: templateId,
          variables,
        },
      });

      this.logger.log('Email enviado 📨');
    } catch (error) {
      this.logger.error('Error enviando email', error);
      throw error;
    }
  }

  // 🔥 Método específico (recomendado)
  async sendInviteEmail(
    to: string | string[],
    data: EmailTemplateMap['invite-template-id'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'invite-template-id',
      variables: data,
    });
  }

  async sendInvitationGuestEmail(
    to: string | string[],
    data: EmailTemplateMap['send-invitation-guest'],
  ) {
    return this.sendEmail({
      to,
      subject: 'Tienes una nueva invitación en Musila',
      templateId: 'send-invitation-guest',
      variables: data,
    });
  }

  async sendRequestTrackEmail(
    to: string | string[],
    data: EmailTemplateMap['send-request-track'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'send-request-track',
      variables: data,
    });
  }

  async sendPasswordResetEmail(
    to: string | string[],
    data: EmailTemplateMap['password-reset-template-id'],
  ) {
    return this.sendEmail({
      to,
      subject: 'Restablecer tu contraseña',
      templateId: 'password-reset-template-id',
      variables: data,
    });
  }

  async sendPasswordChangedEmail(
    to: string | string[],
    data: EmailTemplateMap['password-changed-template-id'],
  ) {
    return this.sendEmail({
      to,
      subject: 'Notificación de seguridad: Contraseña actualizada',
      templateId: 'password-changed-template-id',
      variables: data,
    });
  }
}
