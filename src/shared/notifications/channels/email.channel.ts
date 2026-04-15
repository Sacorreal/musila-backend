import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from 'src/shared/mail/services/email.service';
import { EventListener } from '../../events/decorators/event-listener.decorator'
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';

@Injectable()
export class EmailChannel {
  private readonly logger = new Logger(EmailChannel.name);

  constructor(private readonly emailService: EmailService) {}

  /**
   * 👤 USER CREATED → EMAIL
   */
  @EventListener({
    event: 'user.invite.created',
    channel: 'email',
  })
  async handleUserCreated(
    payload: AppEventMap['user.invite.created'],
  ) {
    this.logger.log('📧 evento user created disparado 🥳');

    await this.emailService.sendInviteEmail(payload.email, {
      invitedByName: payload.name,
      inviteUrl: payload.email
    });
  }

  /**
   * 🧪 TEST EVENT
   */
  @EventListener({
    event: 'event-test',
    channel: 'email',
  })
  handleTestEvent(payload: { message: string }) {  
    this.logger.log(`🧪 Test event: ${payload.message}`);
   
  }
}
