import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { EmailModule } from 'src/shared/mail/email.module';
import { AppNotificationsModule } from 'src/notifications/notifications.module';
import { LicenseCollection } from './entities/license-collection.entity';
import { LicenseCollectionsController } from './license-collections.controller';
import { LicenseCollectionsService } from './license-collections.service';
import { PaymentLinkTokenService } from './services/payment-link-token.service';
import { SendPaymentLinksCron } from './jobs/send-payment-links.cron';
import { MarkOverdueCollectionsCron } from './jobs/mark-overdue-collections.cron';
import { LicenseCollectionPaymentListener } from './listeners/license-collection-payment.listener';
import { LicenseCollectionAdminNotifierListener } from './listeners/license-collection-admin-notifier.listener';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([LicenseCollection, RequestedTrack, User]),
    EmailModule.forRootAsync(),
    AppNotificationsModule,
  ],
  controllers: [LicenseCollectionsController],
  providers: [
    LicenseCollectionsService,
    PaymentLinkTokenService,
    SendPaymentLinksCron,
    MarkOverdueCollectionsCron,
    LicenseCollectionPaymentListener,
    LicenseCollectionAdminNotifierListener,
  ],
  exports: [LicenseCollectionsService],
})
export class LicenseCollectionsModule {}
