import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StepUpGuard } from '../auth/guards/step-up.guard';
import { RequireStepUp } from '../auth/decorators/require-step-up.decorator';
import { WorkspaceSecurityComplianceGuard } from '../auth/guards/workspace-security-compliance.guard';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RequireCapability } from '../authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { AuditAction } from '../staff-audit/decorators/audit-action.decorator';
import { StaffAuditInterceptor } from '../staff-audit/interceptors/staff-audit.interceptor';
import { OrganizationType } from '../organizations/entities/organization-type.enum';
import { PLATFORM_PLANS_MANAGE_CAPABILITY } from './commission.constants';
import { UpdateTransactionFeeDto } from './dto/update-transaction-fee.dto';
import { TransactionFeesAdminService } from './transaction-fees-admin.service';

/**
 * Admin de Musila → Plans → Marketplace → Transaction Fees (§6/§8). Toda la
 * autorización pasa por la capability interna `platform.plans.manage` (§8) y
 * cada modificación queda auditada por `StaffAuditInterceptor` (§20). El
 * historial de vigencia (§21) lo conserva la tabla `transaction_fee_config`.
 */
@ApiTags('Marketplace · Comisión (admin)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard, WorkspaceSecurityComplianceGuard)
@UseInterceptors(StaffAuditInterceptor)
@Controller('admin/plans')
export class TransactionFeesAdminController {
  constructor(private readonly transactionFeesAdminService: TransactionFeesAdminService) {}

  @Get('transaction-fees')
  @RequireCapability(PLATFORM_PLANS_MANAGE_CAPABILITY)
  @ApiOperation({ summary: 'Matriz completa plan × tipo de organización × comisión vigente' })
  listAll() {
    return this.transactionFeesAdminService.listAll();
  }

  @Get(':planId/transaction-fee')
  @RequireCapability(PLATFORM_PLANS_MANAGE_CAPABILITY)
  @ApiParam({ name: 'planId' })
  @ApiOperation({ summary: 'Consultar la comisión vigente de un plan por tipo de organización' })
  getForPlan(@Param('planId', ParseUUIDPipe) planId: string) {
    return this.transactionFeesAdminService.getForPlan(planId);
  }

  @Get(':planId/transaction-fee/history')
  @RequireCapability(PLATFORM_PLANS_MANAGE_CAPABILITY)
  @ApiParam({ name: 'planId' })
  @ApiQuery({ name: 'organizationType', enum: OrganizationType, required: false })
  @ApiOperation({ summary: 'Consultar el historial de vigencia de la comisión de un plan' })
  getHistory(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Query('organizationType') organizationType?: OrganizationType,
  ) {
    return this.transactionFeesAdminService.getHistory(planId, organizationType);
  }

  @Put(':planId/transaction-fee')
  @UseGuards(StepUpGuard)
  @RequireCapability(PLATFORM_PLANS_MANAGE_CAPABILITY)
  @RequireStepUp('platform.plans.transaction_fee.update')
  @AuditAction('marketplace:transaction-fee:update')
  @ApiParam({ name: 'planId' })
  @ApiOperation({ summary: 'Actualizar la comisión de un plan para un tipo de organización' })
  update(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: UpdateTransactionFeeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.transactionFeesAdminService.update({
      planId,
      organizationType: dto.organizationType,
      rate: dto.rate,
      actorUserId: user.id,
      actorName: user.name ?? user.email,
    });
  }
}
