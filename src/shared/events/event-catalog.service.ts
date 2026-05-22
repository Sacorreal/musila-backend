import { Injectable } from '@nestjs/common';
import { EventRegistry } from './contracts/event-registry';

@Injectable()
export class EventCatalogService {
  getAll() {
    return EventRegistry;
  }

  getByChannel(channel: string) {
    return EventRegistry.filter(e => e.channel === channel);
  }

  groupByEvent() {
    const map: Record<string, any[]> = {};

    for (const entry of EventRegistry) {
      if (!map[entry.event]) {
        map[entry.event] = [];
      }
      map[entry.event].push(entry);
    }

    return map;
  }
}