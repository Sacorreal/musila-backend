import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBusService } from './event-bus.service';
import { EventCatalogService} from './event-catalog.service'
import { DiscoveryModule } from '@nestjs/core';
import {EventListenerLoader } from './event-listener.loader'
@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    DiscoveryModule
  ],
  providers: [EventBusService, EventCatalogService, EventListenerLoader],
  exports: [EventBusService],
})
export class EventBusModule {}