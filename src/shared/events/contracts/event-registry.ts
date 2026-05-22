import { AppEventName } from '../contracts/app-event-name.type'

export type EventChannel = 'email' | 'websocket' | 'in-app' | 'other';

export interface EventConsumer {
  event: AppEventName;
  handlerName: string;
  module: string;
  channel: EventChannel;
}

export const EventRegistry: EventConsumer[] = [];