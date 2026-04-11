import { Module } from '@nestjs/common';
import { EmailChannel } from './channels/email.channel';
import { EmailService } from 'src/mail/services/email.service'


@Module({
   providers: [   
    EmailChannel,
    EmailService,   
  ],
})
export class NotificationsModule {}
