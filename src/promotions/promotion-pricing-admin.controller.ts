import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StepUpGuard } from '../auth/guards/step-up.guard';
import { RequireStepUp } from '../auth/decorators/require-step-up.decorator';
import { WorkspaceSecurityComplianceGuard } from '../auth/guards/workspace-security-compliance.guard';
import { PlansGuard } from '../users/guards/plans.guard';
import { AllowedPlans } from '../users/decorators/allowed-plans.decorator';
import { UserPlanType } from '../users/entities/user-plan-type.enum';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PromotionPricingConfigService } from './promotion-pricing-config.service';
import { PromotionType } from './entities/promotion-type.enum';
import { UpdatePromotionPriceDto } from './dto/update-promotion-price.dto';

/**
 * Gestión de precios de pautas por el superadmin (requerimiento §REQUIREMENTS:
 * "el superadmin puede gestionar el precio de cada tipo de pauta desde la UI sin
 * modificar código"). Historial de vigencia versionado en la tabla.
 */
@ApiTags('Pautas · Precios (superadmin)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, PlansGuard, WorkspaceSecurityComplianceGuard)
@AllowedPlans(UserPlanType.SUPERADMIN)
@Controller('admin/promotions/pricing')
export class PromotionPricingAdminController {
  constructor(private readonly pricingService: PromotionPricingConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Precios vigentes por tipo de pauta' })
  listCurrent() {
    return this.pricingService.listCurrent();
  }

  @Get('history')
  @ApiQuery({ name: 'type', enum: PromotionType, required: false })
  @ApiOperation({ summary: 'Historial de vigencia de precios' })
  getHistory(@Query('type') type?: PromotionType) {
    return this.pricingService.getHistory(type);
  }

  @Put()
  @UseGuards(StepUpGuard)
  @RequireStepUp('platform.promotions.pricing.update')
  @ApiOperation({ summary: 'Actualizar el precio de un tipo de pauta (versionado)' })
  update(@Body() dto: UpdatePromotionPriceDto, @CurrentUser() user: JwtPayload) {
    return this.pricingService.setPrice({
      type: dto.type,
      amount: dto.amount,
      actorUserId: user.id,
      actorName: user.name ?? user.email,
    });
  }
}
