import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Notification } from 'src/notifications/entities/notification.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { EmailModule } from 'src/shared/mail/email.module';
import { Payment } from './entities/payment.entity';
import { PaymentSource } from './entities/payment-source.entity';
import { PendingRegistration } from './entities/pending-registration.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ReceiptService } from './receipt.service';
import { PlanExpiryNotificationsService } from './plan-expiry-notifications.service';
import { SubscriptionRenewalService } from './subscription-renewal.service';
import { PAYMENT_PROVIDER } from './domain/payment-provider.interface';
import { WompiProvider } from './providers/wompi/wompi.provider';
import { WompiSignatureService } from './providers/wompi/wompi-signature.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Payment,
      PaymentSource,
      PendingRegistration,
      User,
      Notification,
      RequestedTrack,
    ]),
    EmailModule.forRootAsync(),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    ReceiptService,
    PlanExpiryNotificationsService,
    SubscriptionRenewalService,
    WompiSignatureService,
    // Proveedor de pago activo. Sustituir aquí para cambiar de pasarela.
    { provide: PAYMENT_PROVIDER, useClass: WompiProvider },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
