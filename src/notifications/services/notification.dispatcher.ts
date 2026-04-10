import { Injectable, Logger } from '@nestjs/common';
import { EmailChannel } from '../channels/email.channel';

export type ChannelType = 'email' | 'sms' | 'push';

@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name);

  constructor(
    private readonly emailChannel: EmailChannel,
    // future: smsChannel, pushChannel
  ) {}

  async dispatch(event: {
    type: string;
    channels: ChannelType[];
    payload: any;
  }): Promise<void> {
    const tasks: Promise<void>[] = [];

    for (const channel of event.channels) {
      switch (channel) {
        case 'email':
          tasks.push(this.emailChannel.send(event));
          break;

        case 'sms':
          this.logger.warn('SMS not implemented');
          break;

        case 'push':
          this.logger.warn('Push not implemented');
          break;
      }
    }

    await Promise.all(tasks);
  }
}