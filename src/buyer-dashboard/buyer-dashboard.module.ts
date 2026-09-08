import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { RosterMembership } from 'src/organizations/entities/roster-membership.entity';
import { TracksModule } from 'src/tracks/tracks.module';
import { BuyerDashboardController } from './buyer-dashboard.controller';
import { BuyerDashboardService } from './buyer-dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RequestedTrack, RosterMembership]),
    TracksModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [BuyerDashboardController],
  providers: [BuyerDashboardService],
})
export class BuyerDashboardModule {}
