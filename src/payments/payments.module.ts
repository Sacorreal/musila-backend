import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from 'src/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Notification } from 'src/notifications/entities/notification.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { EmailModule } from 'src/shared/mail/email.module';
import { LicenseCollectionsModule } from 'src/license-collections/license-collections.module';
import { CommissionModule } from 'src/commission/commission.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { Payment } from './entities/payment.entity';
import { PaymentSource } from './entities/payment-source.entity';
import { PendingRegistration } from './entities/pending-registration.entity';
import { OrganizationBillingRequest } from './entities/organization-billing-request.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsAdminController } from './payments-admin.controller';
import { PaymentsService } from './payments.service';
import { ReceiptService } from './receipt.service';
import { OrganizationBillingService } from './organization-billing.service';
import { OrganizationBillingPaymentListener } from './listeners/organization-billing-payment.listener';
import { PlanExpiryNotificationsService } from './plan-expiry-notifications.service';
import { SubscriptionRenewalService } from './subscription-renewal.service';
import { OrganizationSubscriptionRemindersService } from './jobs/organization-subscription-reminders.service';
import { OrganizationSubscriptionRenewalService } from './jobs/organization-subscription-renewal.service';
import { OrganizationSubscriptionSuspensionService } from './jobs/organization-subscription-suspension.service';
import { WompiProvider } from './providers/wompi/wompi.provider';
import { WompiSignatureService } from './providers/wompi/wompi-signature.service';
import { WompiBankTransferProvider } from './providers/wompi/wompi-bank-transfer.provider';
import { StripeProvider } from './providers/stripe/stripe.provider';
import { paymentProviderFactory } from './payment-provider.factory';
import { bankTransferProviderFactory } from './bank-transfer-provider.factory';
import { PAYMENT_PROVIDER } from './domain/payment-provider.interface';
import { BANK_TRANSFER_PROVIDER } from './domain/bank-transfer-provider.interface';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Payment,
      PaymentSource,
      PendingRegistration,
      OrganizationBillingRequest,
      User,
      Notification,
      RequestedTrack,
    ]),
    EmailModule.forRootAsync(),
    LicenseCollectionsModule,
    CommissionModule,
    WalletModule,
    OrganizationsModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [PaymentsController, PaymentsAdminController],
  providers: [
    PaymentsService,
    ReceiptService,
    OrganizationBillingService,
    OrganizationBillingPaymentListener,
    OrganizationSubscriptionRemindersService,
    OrganizationSubscriptionRenewalService,
    OrganizationSubscriptionSuspensionService,
    PlanExpiryNotificationsService,
    SubscriptionRenewalService,
    WompiSignatureService,
    WompiProvider,
    WompiBankTransferProvider,
    StripeProvider,
    // Proveedor de pago activo, seleccionado vía PAYMENT_PROVIDER (env var).
    paymentProviderFactory,
    // Proveedor de transferencias bancarias activo, vía BANK_TRANSFER_PROVIDER (env var).
    bankTransferProviderFactory,
  ],
  exports: [PaymentsService, PAYMENT_PROVIDER, BANK_TRANSFER_PROVIDER],
})
export class PaymentsModule {}
