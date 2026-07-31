import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { LicenseContract } from 'src/license-contracts/entities/license-contract.entity';
import { LicenseCollection } from 'src/license-collections/entities/license-collection.entity';
import { Split } from 'src/splits/entities/split.entity';
import { AppNotificationsModule } from 'src/notifications/notifications.module';
import { WalletEarning } from './entities/wallet-earning.entity';
import { WalletWithdrawal } from './entities/wallet-withdrawal.entity';
import { WalletController } from './wallet.controller';
import { WalletAdminController } from './wallet-admin.controller';
import { WalletDistributionService } from './services/wallet-distribution.service';
import { WalletEarningsService } from './services/wallet-earnings.service';
import { WalletWithdrawalsService } from './services/wallet-withdrawals.service';
import { WalletNotificationService } from './services/wallet-notification.service';
import { WalletEarningListener } from './listeners/wallet-earning.listener';
import { WalletWithdrawalNotificationListener } from './listeners/wallet-withdrawal-notification.listener';
import { WalletNotificationRetryCron } from './jobs/wallet-notification-retry.cron';

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
    ]),
    AppNotificationsModule,
  ],
  controllers: [WalletController, WalletAdminController],
  providers: [
    WalletDistributionService,
    WalletEarningsService,
    WalletWithdrawalsService,
    WalletNotificationService,
    WalletEarningListener,
    WalletWithdrawalNotificationListener,
    WalletNotificationRetryCron,
  ],
  exports: [WalletEarningsService, WalletWithdrawalsService],
})
export class WalletModule {}
