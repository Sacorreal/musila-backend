import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Organization } from 'src/organizations/entities/organization.entity';
import { RosterMembership } from 'src/organizations/entities/roster-membership.entity';
import { PublisherShare } from './entities/publisher-share.entity';
import { PublisherRelationshipAuditLog } from './entities/publisher-relationship-audit-log.entity';
import { PublisherShareController } from './publisher-share.controller';
import { MyPublisherShareController } from './my-publisher-share.controller';
import { PublisherShareService } from './publisher-share.service';
import { PublisherShareAuditPersistenceListener } from './listeners/publisher-share-audit-persistence.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([PublisherShare, RosterMembership, Organization, PublisherRelationshipAuditLog]),
    forwardRef(() => AuthModule),
  ],
  controllers: [PublisherShareController, MyPublisherShareController],
  providers: [PublisherShareService, PublisherShareAuditPersistenceListener],
  exports: [PublisherShareService],
})
export class PublisherShareModule {}
