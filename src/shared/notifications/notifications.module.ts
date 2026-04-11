import { Module } from '@nestjs/common';
import { EmailChannel } from './channels/email.channel';

@Module({
  providers: [EmailChannel],
})
export class NotificationsModule {}
