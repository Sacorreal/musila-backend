import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { InviteListener } from './listeners/invite.listener';
import { NotificationDispatcher } from './services/notification.dispatcher';
import { EmailChannel } from './channels/email.channel';
import { EmailService } from './services/email.service';
import { ResendProvider } from './providers/resend.provider';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    InviteListener,
    NotificationDispatcher,
    EmailChannel,
    EmailService,
    ResendProvider,
  ],
  exports: [NotificationDispatcher],
})
export class NotificationsModule {}
