import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { NotificationsGateway } from './gateway/websocket.gateway';
import { RealtimeListener } from './listeners/realtime.listener';

@Module({
  imports: [
    JwtModule
  ],
  providers: [
    NotificationsGateway,
    RealtimeListener,
  ],
  exports: [],
})
export class RealtimeModule {}