import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ORGANIZATION_ID_HEADER } from '../authorization/utils/organization-context.util';
import { PromotionsService } from './promotions.service';
import { PromotionPricingConfigService } from './promotion-pricing-config.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';

/**
 * Panel del publisher (requerimiento §Flow 1). Autenticado por JWT; la
 * pertenencia a la organización, su tipo publisher y la propiedad del recurso
 * (roster) se validan en el servicio. La organización activa viaja en el header
 * `x-organization-id` (mismo contrato que el resto del workspace B2B).
 */
@ApiTags('Pautas · Publisher')
@ApiBearerAuth('JWT-auth')
@ApiHeader({ name: ORGANIZATION_ID_HEADER, required: true })
@UseGuards(JWTAuthGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly pricingService: PromotionPricingConfigService,
  ) {}

  private requireOrg(organizationId?: string): string {
    if (!organizationId) {
      throw new BadRequestException(`El header ${ORGANIZATION_ID_HEADER} es obligatorio`);
    }
    return organizationId;
  }

  @Get('pricing')
  @ApiOperation({ summary: 'Precios vigentes de las pautas (track y compositor)' })
  getPricing() {
    return this.pricingService.listCurrent();
  }

  @Get('promotable')
  @ApiOperation({ summary: 'Recursos del roster que se pueden pautar (compositores y tracks)' })
  listPromotable(
    @Headers(ORGANIZATION_ID_HEADER) organizationId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.promotionsService.listPromotableResources(this.requireOrg(organizationId), user.id);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Pautas de mi organización (activas, pendientes y caducadas)' })
  listMine(
    @Headers(ORGANIZATION_ID_HEADER) organizationId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.promotionsService.listByOrganization(this.requireOrg(organizationId), user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Solicitar una pauta (registra en estado pendiente de pago)' })
  create(
    @Headers(ORGANIZATION_ID_HEADER) organizationId: string | undefined,
    @Body() dto: CreatePromotionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.promotionsService.createPromotion(user.id, this.requireOrg(organizationId), dto);
  }

  @Post(':id/checkout')
  @ApiOperation({ summary: 'Generar el enlace/Widget de pago de una pauta pendiente' })
  checkout(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers(ORGANIZATION_ID_HEADER) organizationId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.promotionsService.createCheckout(user.id, this.requireOrg(organizationId), id);
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: 'Retirar una pauta propia' })
  withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers(ORGANIZATION_ID_HEADER) organizationId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.promotionsService.withdraw(id, this.requireOrg(organizationId), user.id);
  }
}
