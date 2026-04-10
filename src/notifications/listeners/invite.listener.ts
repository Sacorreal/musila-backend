import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { NotificationDispatcher } from '../services/notification.dispatcher';
import { NotificationEvents } from '../events/notification.events';

@Injectable()
export class InviteListener {
  private readonly logger = new Logger(InviteListener.name);

  constructor(
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  @OnEvent(NotificationEvents.INVITE_CREATED)
  async handleInviteCreated(payload: any) {
    this.logger.log('Handling invite.created event');

    await this.dispatcher.dispatch({
      type: 'INVITE_CREATED',
      channels: ['email'],
      payload,
    });
  }
}