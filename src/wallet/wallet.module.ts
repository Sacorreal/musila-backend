import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { User } from 'src/users/entities/user.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { LicenseContract } from 'src/license-contracts/entities/license-contract.entity';
import { LicenseCollection } from 'src/license-collections/entities/license-collection.entity';
import { Split } from 'src/splits/entities/split.entity';
import { Organization } from 'src/organizations/entities/organization.entity';
import { AppNotificationsModule } from 'src/notifications/notifications.module';
import { PublisherCommissionModule } from 'src/publisher-commission/publisher-commission.module';
import { WalletEarning } from './entities/wallet-earning.entity';
import { WalletWithdrawal } from './entities/wallet-withdrawal.entity';
import { WalletController } from './wallet.controller';
import { WalletAdminController } from './wallet-admin.controller';
import { PublisherWalletController } from './publisher-wallet.controller';
import { WalletDistributionService } from './services/wallet-distribution.service';
import { WalletEarningsService } from './services/wallet-earnings.service';
import { WalletWithdrawalsService } from './services/wallet-withdrawals.service';
import { WalletNotificationService } from './services/wallet-notification.service';
import { PublisherCommissionFreezeService } from './services/publisher-commission-freeze.service';
import { OrganizationBankAccountService } from './services/organization-bank-account.service';
import { WalletEarningListener } from './listeners/wallet-earning.listener';
import { WalletWithdrawalNotificationListener } from './listeners/wallet-withdrawal-notification.listener';
import { WalletNotificationRetryCron } from './jobs/wallet-notification-retry.cron';
import { WalletAutoPayoutCron } from './jobs/wallet-auto-payout.cron';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      WalletEarning,
      WalletWithdrawal,
      RequestedTrack,
      LicenseContract,
      LicenseCollection,
      Split,
      User,
      Organization,
    ]),
    AppNotificationsModule,
    PublisherCommissionModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [WalletController, WalletAdminController, PublisherWalletController],
  providers: [
    WalletDistributionService,
    WalletEarningsService,
    WalletWithdrawalsService,
    WalletNotificationService,
    PublisherCommissionFreezeService,
    OrganizationBankAccountService,
    WalletEarningListener,
    WalletWithdrawalNotificationListener,
    WalletNotificationRetryCron,
    WalletAutoPayoutCron,
  ],
  exports: [WalletEarningsService, WalletWithdrawalsService, PublisherCommissionFreezeService],
})
export class WalletModule {}
