import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PlansGuard } from 'src/users/guards/plans.guard';
import { AllowedPlans } from 'src/users/decorators/allowed-plans.decorator';
import { ADMIN_PLAN_TYPES } from 'src/users/entities/user-plan-type.enum';
import { PaymentsService } from './payments.service';
import { PaymentPaginationDto } from './dto/payment-pagination.dto';
import { PaymentSourcePaginationDto } from './dto/payment-source-pagination.dto';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

/**
 * Endpoints de solo lectura para el panel de administración.
 * Los pagos y fuentes de pago se generan exclusivamente vía Wompi/webhooks;
 * este controller nunca expone create/update/delete, por integridad financiera y PCI-DSS.
 */
@ApiTags('Pagos (Admin)')
@UseGuards(JWTAuthGuard, PlansGuard)
@AllowedPlans(...ADMIN_PLAN_TYPES)
@Controller('payments/admin')
export class PaymentsAdminController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar todos los pagos del sistema (Admin, solo lectura)' })
  async findAllController(@Query() pagination: PaymentPaginationDto) {
    return this.paymentsService.findAllPaymentsAdmin(pagination);
  }

  @Get('payment-sources')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar todas las fuentes de pago (Admin, solo lectura)' })
  async findAllPaymentSourcesController(@Query() pagination: PaymentSourcePaginationDto) {
    return this.paymentsService.findAllPaymentSourcesAdmin(pagination);
  }

  @Get('pending-registrations')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar registros de pago pendientes (Admin, solo lectura)' })
  async findAllPendingRegistrationsController(@Query() pagination: PaginationDto) {
    return this.paymentsService.findAllPendingRegistrationsAdmin(pagination);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener el detalle de un pago (Admin, solo lectura)' })
  async findOneController(@Param('id') id: string) {
    return this.paymentsService.findOnePaymentAdmin(id);
  }
}
