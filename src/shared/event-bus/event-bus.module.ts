/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBusService } from './event-bus.service';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot(),
  ],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventBusModule {}