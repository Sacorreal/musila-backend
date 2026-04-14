/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import 'reflect-metadata';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { EventBusService } from './event-bus.service';
import {
  EVENT_LISTENER_METADATA,
  EventListenerMetadata,
} from './decorators/event-listener.decorator';
import { EventRegistry } from './contracts/event-registry';

@Injectable()
export class EventListenerLoader implements OnModuleInit {
  private readonly logger = new Logger(EventListenerLoader.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    const providers = this.discoveryService.getProviders();

    for (const wrapper of providers) {
      const instance = wrapper.instance;

      if (!instance || typeof instance !== 'object') continue;

      const prototype = Object.getPrototypeOf(instance);

      const methodNames = Object.getOwnPropertyNames(prototype).filter(
        (method) =>
          method !== 'constructor' &&
          typeof prototype[method] === 'function',
      );

      for (const methodName of methodNames) {
        const metadata: EventListenerMetadata = Reflect.getMetadata(
          EVENT_LISTENER_METADATA,
          prototype,
          methodName,
        );

        if (!metadata) continue;

        const methodRef = instance[methodName].bind(instance);

        this.logger.log(
          `🔗 Registrando: ${metadata.event} → ${wrapper.name}.${methodName}`,
        );

        // 🔥 registrar en EventBus
        this.eventBus.on(metadata.event as any, methodRef);

        // 🔥 registrar en registry
        EventRegistry.push({
          event: metadata.event,
          handlerName: methodName,
          module: wrapper.name || 'Unknown',
          channel: metadata.channel,
        });
      }
    }
  }
}