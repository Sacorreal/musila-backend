import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entitlement } from '../entitlements/entities/entitlement.entity';
import { Plan } from '../entitlements/entities/plan.entity';
import { StaffAuditModule } from '../staff-audit/staff-audit.module';
import { AuthModule } from '../auth/auth.module';
import { CommissionService } from './commission.service';
import { TransactionFeeConfig } from './entities/transaction-fee-config.entity';
import { TransactionFeeConfigService } from './transaction-fee-config.service';
import { TransactionFeesAdminController } from './transaction-fees-admin.controller';
import { TransactionFeesAdminService } from './transaction-fees-admin.service';

/**
 * Comisión transaccional configurable por plan para organizaciones compradoras.
 * `CommissionService` resuelve/calcula/congela la comisión (delegando la
 * resolución de tarifa en `EntitlementService`, global); el área admin gestiona
 * la configuración versionada. `EntitlementsModule` (global) posee la resolución
 * en caliente de la tarifa y su cache.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionFeeConfig, Entitlement, Plan]),
    forwardRef(() => StaffAuditModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [TransactionFeesAdminController],
  providers: [CommissionService, TransactionFeeConfigService, TransactionFeesAdminService],
  exports: [CommissionService, TransactionFeeConfigService],
})
export class CommissionModule {}
