import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectiveManagementSocietyModule } from 'src/collective-management-society/collective-management-society.module';
import { SocietyAffiliation } from './entities/society-affiliation.entity';
import { SocietyAffiliationAuditLog } from './entities/society-affiliation-audit-log.entity';
import { SocietyAffiliationController } from './society-affiliation.controller';
import { SocietyAffiliationService } from './society-affiliation.service';
import { SocietyAffiliationAuditPersistenceListener } from './listeners/society-affiliation-audit-persistence.listener';

@Module({
  imports: [TypeOrmModule.forFeature([SocietyAffiliation, SocietyAffiliationAuditLog]), CollectiveManagementSocietyModule],
  controllers: [SocietyAffiliationController],
  providers: [SocietyAffiliationService, SocietyAffiliationAuditPersistenceListener],
  exports: [SocietyAffiliationService],
})
export class SocietyAffiliationModule {}
