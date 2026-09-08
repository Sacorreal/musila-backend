import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { AccessRequest } from 'src/organizations/entities/access-request.entity';
import { Organization } from 'src/organizations/entities/organization.entity';
import { PublisherShare } from 'src/publisher-share/entities/publisher-share.entity';
import { PublisherShareModule } from 'src/publisher-share/publisher-share.module';
import { PublishingContractsModule } from 'src/publishing-contracts/publishing-contracts.module';
import { EditorialRelationshipsService } from './editorial-relationships.service';
import { EditorialRelationshipsController } from './editorial-relationships.controller';
import { PublisherEditorialRelationshipsController } from './publisher-editorial-relationships.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccessRequest, PublisherShare, Organization]),
    PublisherShareModule,
    PublishingContractsModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [EditorialRelationshipsController, PublisherEditorialRelationshipsController],
  providers: [EditorialRelationshipsService],
})
export class EditorialRelationshipsModule {}
