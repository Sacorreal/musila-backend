import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Track } from 'src/tracks/entities/track.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { WalletEarning } from 'src/wallet/entities/wallet-earning.entity';
import { LicenseCollection } from 'src/license-collections/entities/license-collection.entity';
import { Organization } from 'src/organizations/entities/organization.entity';
import { RosterMembership } from 'src/organizations/entities/roster-membership.entity';
import { TracksModule } from 'src/tracks/tracks.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { PublisherDashboardController } from './publisher-dashboard.controller';
import { PublisherDashboardService } from './publisher-dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Track, RequestedTrack, WalletEarning, LicenseCollection, Organization, RosterMembership]),
    TracksModule,
    WalletModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [PublisherDashboardController],
  providers: [PublisherDashboardService],
})
export class PublisherDashboardModule {}
