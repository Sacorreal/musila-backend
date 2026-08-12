import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../organizations/entities/organization.entity';
import { RosterMembership } from '../organizations/entities/roster-membership.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { Track } from '../tracks/entities/track.entity';
import { User } from '../users/entities/user.entity';
import { PaymentsModule } from '../payments/payments.module';
import { AppNotificationsModule } from '../notifications/notifications.module';
import { Promotion } from './entities/promotion.entity';
import { PromotionPricingConfig } from './entities/promotion-pricing-config.entity';
import { PromotionsService } from './promotions.service';
import { PromotionPricingConfigService } from './promotion-pricing-config.service';
import { PromotionSlotService } from './promotion-slot.service';
import { FeaturedService } from './featured.service';
import { PromotionSchedulerService } from './promotion-scheduler.service';
import { PromotionPaymentListener } from './promotion-payment.listener';
import { PromotionNotificationListener } from './promotion-notification.listener';
import { PromotionsController } from './promotions.controller';
import { PromotionsAdminController } from './promotions-admin.controller';
import { PromotionPricingAdminController } from './promotion-pricing-admin.controller';
import { FeaturedController } from './featured.controller';

/**
 * Módulo de pautas publicitarias (destacados pagados). Importa PaymentsModule
 * en un único sentido (reutiliza el proveedor de pago para el checkout) y
 * consume el webhook de forma desacoplada vía el evento
 * `payment.webhook.unmatched`, evitando dependencia circular.
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Promotion,
      PromotionPricingConfig,
      Organization,
      RosterMembership,
      OrganizationMembership,
      Track,
      User,
    ]),
    PaymentsModule,
    AppNotificationsModule,
  ],
  controllers: [
    PromotionsController,
    PromotionsAdminController,
    PromotionPricingAdminController,
    FeaturedController,
  ],
  providers: [
    PromotionsService,
    PromotionPricingConfigService,
    PromotionSlotService,
    FeaturedService,
    PromotionSchedulerService,
    PromotionPaymentListener,
    PromotionNotificationListener,
  ],
  exports: [PromotionsService, FeaturedService],
})
export class PromotionsModule {}
