import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBusService } from './event-bus.service';
import { EventCatalogService } from './event-catalog.service'
import { DiscoveryModule } from '@nestjs/core';
import { EventListenerLoader } from './event-listener.loader'
import { User } from 'src/users/entities/user.entity';
@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    DiscoveryModule
  ],
  providers: [EventBusService, EventCatalogService, EventListenerLoader, User],
  exports: [EventBusService],
})
export class EventBusModule { }