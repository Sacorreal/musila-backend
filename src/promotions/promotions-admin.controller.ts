import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlansGuard } from '../users/guards/plans.guard';
import { AllowedPlans } from '../users/decorators/allowed-plans.decorator';
import { ADMIN_PLAN_TYPES } from '../users/entities/user-plan-type.enum';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PromotionsService } from './promotions.service';
import { PromotionAdminQueryDto } from './dto/promotion-query.dto';
import { RejectPromotionDto } from './dto/reject-promotion.dto';

/**
 * Gestión administrativa de pautas (requerimiento §FEATURES 3/4). Solo staff de
 * Musila (planes admin). El administrador ve las solicitudes con el solicitante
 * y el recurso, y aprueba/rechaza cambiando el estado de la pauta.
 */
@ApiTags('Pautas · Admin')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, PlansGuard)
@AllowedPlans(...ADMIN_PLAN_TYPES)
@Controller('admin/promotions')
export class PromotionsAdminController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar solicitudes de pauta con filtros por estado/tipo' })
  list(@Query() query: PromotionAdminQueryDto) {
    return this.promotionsService.listForAdmin({ status: query.status, type: query.type });
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Aprobar una pauta en revisión (la programa para publicación)' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.promotionsService.approve(id, user.id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Rechazar una pauta en revisión con motivo' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectPromotionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.promotionsService.reject(id, user.id, dto.reason);
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: 'Retirar una pauta (acción administrativa)' })
  withdraw(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotionsService.withdraw(id, null);
  }
}
