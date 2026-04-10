import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../services/email.service';

@Injectable()
export class EmailChannel {
  private readonly logger = new Logger(EmailChannel.name);

  constructor(private readonly emailService: EmailService) {}

  async send(event: any): Promise<void> {
    try {
      switch (event.type) {
        case 'INVITE_CREATED':
          await this.emailService.sendInviteEmail(
            event.payload.email,
            event.payload.token,
            event.payload.invitedByName,
          );
          break;

        default:
          this.logger.warn(`Unhandled email event: ${event.type}`);
      }
    } catch (error) {
      this.logger.error('Email channel failed', error);
      throw error;
    }
  }
}