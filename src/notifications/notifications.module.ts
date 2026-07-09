import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsAdminController } from './notifications-admin.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationListener } from './listeners/notification.listener';
import { RealtimeModule } from 'src/shared/realtime/realtime.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User]), RealtimeModule],
  controllers: [NotificationsController, NotificationsAdminController],
  providers: [NotificationsService, NotificationsGateway, NotificationListener],
  exports: [NotificationsService],
})
export class AppNotificationsModule {}
