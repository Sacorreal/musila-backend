import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Notification } from 'src/notifications/entities/notification.entity';
import { EmailModule } from 'src/shared/mail/email.module';
import { Payment } from './entities/payment.entity';
import { PendingRegistration } from './entities/pending-registration.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ReceiptService } from './receipt.service';
import { PlanExpiryNotificationsService } from './plan-expiry-notifications.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Payment, PendingRegistration, User, Notification]),
    EmailModule.forRootAsync(),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, ReceiptService, PlanExpiryNotificationsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
