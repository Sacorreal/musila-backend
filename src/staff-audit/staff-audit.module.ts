import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffUserRole } from 'src/staff-authorization/entities/staff-user-role.entity';
import { StaffAuthorizationModule } from 'src/staff-authorization/staff-authorization.module';
import { StaffAuditLog } from './entities/staff-audit-log.entity';
import { StaffAuditLogService } from './staff-audit-log.service';
import { StaffAuditLogController } from './staff-audit-log.controller';
import { StaffAuditInterceptor } from './interceptors/staff-audit.interceptor';
import { StaffAuditPersistenceListener } from './listeners/staff-audit-persistence.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([StaffAuditLog, StaffUserRole]),
    forwardRef(() => StaffAuthorizationModule),
  ],
  controllers: [StaffAuditLogController],
  providers: [StaffAuditLogService, StaffAuditInterceptor, StaffAuditPersistenceListener],
  exports: [StaffAuditLogService, StaffAuditInterceptor],
})
export class StaffAuditModule {}
