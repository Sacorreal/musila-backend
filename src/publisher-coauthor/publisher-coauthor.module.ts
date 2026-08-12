import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { RosterMembership } from 'src/organizations/entities/roster-membership.entity';
import { PublisherRosterCoauthorDefault } from './entities/publisher-roster-coauthor-default.entity';
import { PublisherCoauthorController } from './publisher-coauthor.controller';
import { MyPublisherCoauthorController } from './my-publisher-coauthor.controller';
import { PublisherCoauthorService } from './publisher-coauthor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PublisherRosterCoauthorDefault, RosterMembership, Organization]),
  ],
  controllers: [PublisherCoauthorController, MyPublisherCoauthorController],
  providers: [PublisherCoauthorService],
  exports: [PublisherCoauthorService],
})
export class PublisherCoauthorModule {}
