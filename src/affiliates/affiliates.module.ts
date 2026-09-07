import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Affiliate } from './entities/affiliate.entity';
import { AffiliateCommission } from './entities/affiliate-commission.entity';
import { AffiliatesController } from './affiliates.controller';
import { AffiliatesAdminController } from './affiliates-admin.controller';
import { AffiliatesService } from './affiliates.service';
import { AffiliateCommissionsService } from './affiliate-commissions.service';
import { AffiliatesAdminService } from './affiliates-admin.service';
import { AffiliateJwtAuthGuard } from './guards/affiliate-jwt-auth.guard';
import { affiliateJwtServiceProvider } from './providers/affiliate-jwt.provider';
import { AffiliateCommissionListener } from './listeners/affiliate-commission.listener';
import { AffiliateCommissionApprovalCron } from './jobs/affiliate-commission-approval.cron';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Affiliate, AffiliateCommission, User]),
  ],
  controllers: [AffiliatesController, AffiliatesAdminController],
  providers: [
    AffiliatesService,
    AffiliateCommissionsService,
    AffiliatesAdminService,
    AffiliateJwtAuthGuard,
    AffiliateCommissionListener,
    AffiliateCommissionApprovalCron,
    affiliateJwtServiceProvider,
  ],
  exports: [AffiliatesService],
})
export class AffiliatesModule {}
