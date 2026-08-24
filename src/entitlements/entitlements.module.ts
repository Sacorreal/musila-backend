import { Global, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Capability } from 'src/authorization/entities/capability.entity';
import { TransactionFeeConfig } from 'src/commission/entities/transaction-fee-config.entity';
import { Organization } from 'src/organizations/entities/organization.entity';
import { StaffAuditModule } from 'src/staff-audit/staff-audit.module';
import { EntitlementsController } from './entitlements.controller';
import { EntitlementConsumeInterceptor } from './interceptors/entitlement-consume.interceptor';
import { PlansAdminController } from './plans-admin.controller';
import { PlansAdminService } from './plans-admin.service';
import { SubscriptionsAdminController } from './subscriptions-admin.controller';
import { Entitlement } from './entities/entitlement.entity';
import { Plan } from './entities/plan.entity';
import { PlanCapability } from './entities/plan-capability.entity';
import { PlanEntitlement } from './entities/plan-entitlement.entity';
import { PlanPrice } from './entities/plan-price.entity';
import { Subscription } from './entities/subscription.entity';
import { Usage } from './entities/usage.entity';
import { EntitlementService } from './entitlement.service';
import { PlanPriceService } from './plan-price.service';
import { PaymentSubscriptionSyncListener } from './listeners/payment-subscription-sync.listener';
import { UsageService } from './usage.service';
import { UserPlanSubscriptionSyncService } from './user-plan-subscription-sync.service';

/**
 * Modelo comercial (plans, subscriptions, entitlements, usage). Global para
 * que `@ConsumeEntitlement` + interceptor puedan usarse en cualquier módulo
 * sin cablear imports.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Plan,
      PlanCapability,
      PlanEntitlement,
      PlanPrice,
      Entitlement,
      Subscription,
      Usage,
      Capability,
      Organization,
      TransactionFeeConfig,
    ]),
    forwardRef(() => StaffAuditModule),
  ],
  controllers: [EntitlementsController, PlansAdminController, SubscriptionsAdminController],
  providers: [
    EntitlementService,
    UsageService,
    EntitlementConsumeInterceptor,
    UserPlanSubscriptionSyncService,
    PaymentSubscriptionSyncListener,
    PlansAdminService,
    PlanPriceService,
  ],
  exports: [
    EntitlementService,
    UsageService,
    EntitlementConsumeInterceptor,
    UserPlanSubscriptionSyncService,
    TypeOrmModule,
  ],
})
export class EntitlementsModule {}
