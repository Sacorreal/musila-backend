import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { WorkspaceSecurityComplianceGuard } from 'src/auth/guards/workspace-security-compliance.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { AuditAction } from 'src/staff-audit/decorators/audit-action.decorator';
import { StaffAuditInterceptor } from 'src/staff-audit/interceptors/staff-audit.interceptor';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { SetPlanCapabilitiesDto } from './dto/set-plan-capabilities.dto';
import { SetPlanPriceDto } from './dto/set-plan-price.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpsertPlanEntitlementDto } from './dto/upsert-plan-entitlement.dto';
import { PlanPriceService } from './plan-price.service';
import { PlansAdminService } from './plans-admin.service';

/** Configuración comercial de planes y entitlements desde el Admin de Musila (§19). */
@ApiTags('Entitlements · Planes (admin)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard, WorkspaceSecurityComplianceGuard)
@UseInterceptors(StaffAuditInterceptor)
@Controller('admin')
export class PlansAdminController {
  constructor(
    private readonly plansAdminService: PlansAdminService,
    private readonly planPriceService: PlanPriceService,
  ) {}

  @Get('plans')
  @RequireCapability(['platform.billing.view', 'platform.settings.manage'], 'OR')
  @ApiOperation({ summary: 'Listar planes con sus capabilities y entitlements' })
  findAllPlans() {
    return this.plansAdminService.findAllPlans();
  }

  @Get('entitlements')
  @RequireCapability(['platform.billing.view', 'platform.settings.manage'], 'OR')
  @ApiOperation({ summary: 'Catálogo de entitlements del sistema' })
  findAllEntitlements() {
    return this.plansAdminService.findAllEntitlements();
  }

  @Patch('plans/:planId')
  @RequireCapability('platform.billing.manage')
  @AuditAction('entitlements:plan:update')
  @ApiParam({ name: 'planId' })
  @ApiOperation({ summary: 'Editar nombre/descripción/estado de un plan' })
  updatePlan(@Param('planId', ParseUUIDPipe) planId: string, @Body() dto: UpdatePlanDto) {
    return this.plansAdminService.updatePlan(planId, dto);
  }

  @Put('plans/:planId/entitlements/:entitlementId')
  @RequireCapability('platform.billing.manage')
  @AuditAction('entitlements:plan:entitlement:set')
  @ApiParam({ name: 'planId' })
  @ApiParam({ name: 'entitlementId' })
  @ApiOperation({ summary: 'Fijar límite/período de un entitlement dentro de un plan' })
  upsertPlanEntitlement(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('entitlementId', ParseUUIDPipe) entitlementId: string,
    @Body() dto: UpsertPlanEntitlementDto,
  ) {
    return this.plansAdminService.upsertPlanEntitlement(planId, entitlementId, {
      limit: dto.limit ?? null,
      unlimited: dto.unlimited,
      period: dto.period,
    });
  }

  @Put('plans/:planId/capabilities')
  @RequireCapability('platform.billing.manage')
  @AuditAction('entitlements:plan:capabilities:set')
  @ApiParam({ name: 'planId' })
  @ApiOperation({ summary: 'Reemplazar las capabilities incluidas en un plan' })
  setPlanCapabilities(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: SetPlanCapabilitiesDto,
  ) {
    return this.plansAdminService.setPlanCapabilities(planId, dto.capabilityIds);
  }

  @Get('plans/:planId/price')
  @RequireCapability(['platform.billing.view', 'platform.settings.manage'], 'OR')
  @ApiParam({ name: 'planId' })
  @ApiOperation({ summary: 'Precios vigentes de un plan, por moneda y período (§Registro Legal B2B)' })
  getPlanPrice(@Param('planId', ParseUUIDPipe) planId: string) {
    return this.planPriceService.getForPlan(planId);
  }

  @Get('plans/:planId/price/history')
  @RequireCapability(['platform.billing.view', 'platform.settings.manage'], 'OR')
  @ApiParam({ name: 'planId' })
  @ApiOperation({ summary: 'Historial de vigencia del precio de un plan' })
  getPlanPriceHistory(@Param('planId', ParseUUIDPipe) planId: string) {
    return this.planPriceService.getHistory(planId);
  }

  @Put('plans/:planId/price')
  @RequireCapability('platform.billing.manage')
  @AuditAction('entitlements:plan:price:set')
  @ApiParam({ name: 'planId' })
  @ApiOperation({ summary: 'Configurar el precio de un plan (versiona el historial)' })
  setPlanPrice(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: SetPlanPriceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.planPriceService.setPrice({
      planId,
      currency: dto.currency,
      amountInCents: dto.amountInCents,
      billingPeriod: dto.billingPeriod,
      actorUserId: user.id,
    });
  }
}
