import 'reflect-metadata';
import { AppEventName } from '../contracts/app-event-name.type'

export const EVENT_LISTENER_METADATA = 'EVENT_LISTENER_METADATA';

export interface EventListenerMetadata {
  event: AppEventName;
  channel: 'email' | 'websocket' | 'other'
}

export function EventListener(metadata: EventListenerMetadata) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(
      EVENT_LISTENER_METADATA,
      metadata,
      target,
      propertyKey,
    );
  };
}