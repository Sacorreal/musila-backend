import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  providers: [NotificationsGateway],
  exports: [NotificationsGateway], // Exportado para que los Services puedan inyectarlo
})
export class NotificationsModule {}
