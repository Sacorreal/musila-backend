import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Organization } from 'src/organizations/entities/organization.entity';
import { RosterMembership } from 'src/organizations/entities/roster-membership.entity';
import { PublisherCommissionPolicy } from './entities/publisher-commission-policy.entity';
import { PublisherRosterCommission } from './entities/publisher-roster-commission.entity';
import { PublisherCommissionController } from './publisher-commission.controller';
import { PublisherCommissionService } from './publisher-commission.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PublisherCommissionPolicy,
      PublisherRosterCommission,
      RosterMembership,
      Organization,
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [PublisherCommissionController],
  providers: [PublisherCommissionService],
  exports: [PublisherCommissionService],
})
export class PublisherCommissionModule {}
