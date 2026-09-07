import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from 'src/tracks/entities/track.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { WalletEarning } from 'src/wallet/entities/wallet-earning.entity';
import { LicenseCollection } from 'src/license-collections/entities/license-collection.entity';
import { TracksModule } from 'src/tracks/tracks.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { AuthorDashboardController } from './author-dashboard.controller';
import { AuthorDashboardService } from './author-dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Track, RequestedTrack, WalletEarning, LicenseCollection]),
    TracksModule,
    WalletModule,
  ],
  controllers: [AuthorDashboardController],
  providers: [AuthorDashboardService],
})
export class AuthorDashboardModule {}
