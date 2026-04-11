/* eslint-disable @typescript-eslint/restrict-template-expressions */
 
 
 
import { EMAIL_CONFIG } from '../constants/email.constants';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { SendEmailOptions } from '../interfaces/email.interface';
import type { EmailConfig } from '../interfaces/email-options.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;

  constructor(@Inject(EMAIL_CONFIG) private readonly config: EmailConfig) {
    this.resend = new Resend(this.config.apiKey);
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
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

      this.logger.log(`Email enviado a ${to}`);
    } catch (error) {
      this.logger.error('Error enviando email', error);
      throw error;
    }
  }

  // 🔥 Método específico (recomendado)
  async sendInviteEmail(
    email: string,
    data: {
      invitedByName: string;
      inviteUrl: string;
    },
  ) {
    return this.sendEmail({
      to: email,
      templateId: 'invite-template-id',
      variables: data,
    });
  }

  async sendEmailTest() {
    const { error } = await this.resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: 'schneidercorrea@gmail.com',
      subject: 'Hello World',
      html: '<strong>It works!</strong>',
    });

    if (error) {
      return console.error({ error });
    }
    
  }
}
