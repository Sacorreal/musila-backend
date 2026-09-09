import { forwardRef, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { LicenseContract } from 'src/license-contracts/entities/license-contract.entity';
import { AppNotificationsModule } from 'src/notifications/notifications.module';
import { EmailModule } from 'src/shared/mail/email.module';
import { PaymentsModule } from 'src/payments/payments.module';
import { AuthModule } from 'src/auth/auth.module';
import { UserBankInformation } from './entities/user-bank-information.entity';
import { BankInformationRequest } from './entities/bank-information-request.entity';
import { BankInformationController } from './bank-information.controller';
import { BankInformationService } from './bank-information.service';
import { BankAccountCipherService } from './crypto/bank-account-cipher.service';
import { BankInformationNotificationService } from './services/bank-information-notification.service';
import { BankInformationRequestListener } from './listeners/bank-information-request.listener';
import { BankInformationNotificationRetryCron } from './jobs/bank-information-notification-retry.cron';

/**
 * Desacoplado de `LicenseContractsModule`: reacciona a
 * `wallet.bank_information.requested` vía event bus, no importa ni es
 * importado por ese módulo (mismo patrón que `LicenseCollectionAdminNotifierListener`).
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([UserBankInformation, BankInformationRequest, User, LicenseContract]),
    AppNotificationsModule,
    EmailModule.forRootAsync(),
    PaymentsModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [BankInformationController],
  providers: [
    BankInformationService,
    BankAccountCipherService,
    BankInformationNotificationService,
    BankInformationRequestListener,
    BankInformationNotificationRetryCron,
  ],
  exports: [BankInformationService],
})
export class BankInformationModule {}
