import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { RegistrationFile } from 'src/registration-file/entities/registration-file.entity';
import { Split } from 'src/splits/entities/split.entity';
import { User } from 'src/users/entities/user.entity';
import { AppNotificationsModule } from 'src/notifications/notifications.module';
import { LicenseCollectionsModule } from 'src/license-collections/license-collections.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { LegalIdentityModule } from 'src/legal-identity/legal-identity.module';

import { LicenseContract } from './entities/license-contract.entity';
import { LicenseContractSignatory } from './entities/license-contract-signatory.entity';
import { LicenseContractsController } from './license-contracts.controller';
import { LicenseContractsService } from './license-contracts.service';
import { ExpireLicenseContractsCron } from './jobs/expire-license-contracts.cron';
import { LicenseContractEmailListener } from './listeners/license-contract-email.listener';
import { LicenseContractPaymentListener } from './listeners/license-contract-payment.listener';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      LicenseContract,
      LicenseContractSignatory,
      RequestedTrack,
      Track,
      RegistrationFile,
      Split,
      User,
    ]),
    AppNotificationsModule,
    LicenseCollectionsModule,
    WalletModule,
    LegalIdentityModule,
  ],
  controllers: [LicenseContractsController],
  providers: [
    LicenseContractsService,
    ExpireLicenseContractsCron,
    LicenseContractEmailListener,
    LicenseContractPaymentListener,
  ],
  exports: [LicenseContractsService],
})
export class LicenseContractsModule {}
