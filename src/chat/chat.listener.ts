import { Injectable } from '@nestjs/common';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { ChatGateway } from './chat.gateway';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';

@Injectable()
export class ChatListener {
  constructor(private readonly gateway: ChatGateway) { }

  @EventListener({
    event: 'chat.message.sent',
    channel: 'websocket',
  })
  handleMessageSent(payload: AppEventMap['chat.message.sent']) {
    const room = `chat:${payload.chatId}`;
    this.gateway.emitToRoom(room, 'chat.message.sent', payload);
  }

  @EventListener({
    event: 'chat.message.read',
    channel: 'websocket',
  })
  handleMessageRead(payload: AppEventMap['chat.message.read']) {
    const room = `chat:${payload.chatId}`;
    this.gateway.emitToRoom(room, 'chat.message.read', payload);
  }

  @EventListener({
    event: 'chat.guests.added',
    channel: 'websocket',
  })
  handleGuestsAdded(payload: AppEventMap['chat.guests.added']) {
    const room = `chat:${payload.chatId}`;
    this.gateway.emitToRoom(room, 'chat.guests.added', payload);
  }

  @EventListener({
    event: 'chat.guests.removed',
    channel: 'websocket',
  })
  handleGuestsRemoved(payload: AppEventMap['chat.guests.removed']) {
    const room = `chat:${payload.chatId}`;
    this.gateway.emitToRoom(room, 'chat.guests.removed', payload);
  }
}
