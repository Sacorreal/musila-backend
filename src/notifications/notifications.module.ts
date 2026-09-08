import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { User } from 'src/users/entities/user.entity';
import { OrganizationMembership } from 'src/organizations/entities/organization-membership.entity';
import { MembershipRole } from 'src/authorization/entities/membership-role.entity';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsAdminController } from './notifications-admin.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationListener } from './listeners/notification.listener';
import { RealtimeModule } from 'src/shared/realtime/realtime.module';
import { FollowsModule } from 'src/follows/follows.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User, OrganizationMembership, MembershipRole]),
    RealtimeModule,
    FollowsModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [NotificationsController, NotificationsAdminController],
  providers: [NotificationsService, NotificationsGateway, NotificationListener],
  exports: [NotificationsService, NotificationsGateway],
})
export class AppNotificationsModule {}
