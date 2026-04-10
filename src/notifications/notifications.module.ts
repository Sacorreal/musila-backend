import { Module } from '@nestjs/common';
import { NotificationsGateway } from './socket/websocket.gateway';

@Module({
  providers: [NotificationsGateway],
  exports: [NotificationsGateway], // Exportado para que los Services puedan inyectarlo
})
export class NotificationsModule {}
