import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { RosterMembership } from 'src/organizations/entities/roster-membership.entity';
import { PublisherShare } from './entities/publisher-share.entity';
import { PublisherShareController } from './publisher-share.controller';
import { MyPublisherShareController } from './my-publisher-share.controller';
import { PublisherShareService } from './publisher-share.service';

@Module({
  imports: [TypeOrmModule.forFeature([PublisherShare, RosterMembership, Organization])],
  controllers: [PublisherShareController, MyPublisherShareController],
  providers: [PublisherShareService],
  exports: [PublisherShareService],
})
export class PublisherShareModule {}
