/* eslint-disable @typescript-eslint/no-misused-promises */

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationEventMap } from './contracts/notification-event-map';

@Injectable()
export class EventBusService {
  constructor(private readonly emitter: EventEmitter2) {}

  emit<T extends keyof NotificationEventMap>(
    event: T,
    payload: NotificationEventMap[T],
  ): void {
    this.emitter.emit(event, payload);
  }

  on<T extends keyof NotificationEventMap>(
    event: T,
    handler: (payload: NotificationEventMap[T]) => void | Promise<void>,
  ): void {
    this.emitter.on(event, handler);
  }
}