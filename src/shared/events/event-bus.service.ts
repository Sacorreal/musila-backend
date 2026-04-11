/* eslint-disable @typescript-eslint/no-misused-promises */
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppEventMap} from './contracts/app-event-map'


@Injectable()
export class EventBusService {
  constructor(private readonly emitter: EventEmitter2) {}

  emit<T extends keyof AppEventMap >(
    event: T,
    payload: AppEventMap[T],
  ): void {
    this.emitter.emit(event, payload);
  }

  on<T extends keyof AppEventMap>(
    event: T,
    handler: (payload: AppEventMap[T]) => void | Promise<void>,
  ): void {
    this.emitter.on(event, handler);
  }

}