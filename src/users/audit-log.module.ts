import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogService } from './audit-log.service';

/**
 * Global por el mismo motivo que MembershipModule (ver organizations/membership.module.ts):
 * WorkspaceSecurityComplianceGuard se aplica vía @UseGuards en ~25 controllers
 * de módulos no relacionados, y Nest instancia ese guard en el contexto del
 * módulo dueño de cada controller — AuditLogService debe ser resoluble desde
 * cualquiera de ellos sin que cada uno importe este módulo explícitamente.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
