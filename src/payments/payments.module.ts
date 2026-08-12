import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Notification } from 'src/notifications/entities/notification.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { EmailModule } from 'src/shared/mail/email.module';
import { LicenseCollectionsModule } from 'src/license-collections/license-collections.module';
import { CommissionModule } from 'src/commission/commission.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { Payment } from './entities/payment.entity';
import { PaymentSource } from './entities/payment-source.entity';
import { PendingRegistration } from './entities/pending-registration.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsAdminController } from './payments-admin.controller';
import { PaymentsService } from './payments.service';
import { ReceiptService } from './receipt.service';
import { PlanExpiryNotificationsService } from './plan-expiry-notifications.service';
import { SubscriptionRenewalService } from './subscription-renewal.service';
import { WompiProvider } from './providers/wompi/wompi.provider';
import { WompiSignatureService } from './providers/wompi/wompi-signature.service';
import { StripeProvider } from './providers/stripe/stripe.provider';
import { paymentProviderFactory } from './payment-provider.factory';
import { PAYMENT_PROVIDER } from './domain/payment-provider.interface';

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
    LicenseCollectionsModule,
    CommissionModule,
    WalletModule,
  ],
  controllers: [PaymentsController, PaymentsAdminController],
  providers: [
    PaymentsService,
    ReceiptService,
    PlanExpiryNotificationsService,
    SubscriptionRenewalService,
    WompiSignatureService,
    WompiProvider,
    StripeProvider,
    // Proveedor de pago activo, seleccionado vía PAYMENT_PROVIDER (env var).
    paymentProviderFactory,
  ],
  exports: [PaymentsService, PAYMENT_PROVIDER],
})
export class PaymentsModule {}
