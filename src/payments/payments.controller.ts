import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Logger,
  UseGuards,
  Req,
  Res,
  StreamableFile,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { StepUpGuard } from 'src/auth/guards/step-up.guard';
import { RequireStepUp } from 'src/auth/decorators/require-step-up.decorator';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreateLicenseCheckoutDto } from './dto/create-license-checkout.dto';
import { CreateLicenseInstallmentCheckoutDto } from './dto/create-license-installment-checkout.dto';
import { CreatePaymentSourceDto } from './dto/create-payment-source.dto';
import { PaymentsService } from './payments.service';
import { ReceiptService } from './receipt.service';
import { OrganizationBillingService } from './organization-billing.service';
import { ProviderEvent } from './domain/payment-provider.types';
import { resolveOrganizationId } from 'src/authorization/utils/organization-context.util';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly receiptService: ReceiptService,
    private readonly organizationBillingService: OrganizationBillingService,
  ) {}

  @Get('business-registration/:organizationId/checkout')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Parámetros del Widget de Wompi para el cobro del registro legal B2B (§3)',
  })
  @ApiResponse({ status: 200, description: 'Parámetros del Widget y externalReference' })
  @ApiResponse({ status: 403, description: 'No eres quien registró esta organización' })
  @ApiResponse({ status: 404, description: 'No hay un cobro pendiente para esta organización' })
  async getBusinessRegistrationCheckout(
    @Param('organizationId') organizationId: string,
    @Req() req: Request,
  ) {
    const user = req['user'] as JwtPayload;
    return this.organizationBillingService.getCheckoutWidget(organizationId, user.id);
  }

  @Post('business-registration/:organizationId/payment-source')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tokenizar tarjeta para habilitar el pago automático de la organización (§3)' })
  @ApiResponse({ status: 201, description: 'Fuente de pago tokenizada' })
  @ApiResponse({ status: 403, description: 'No eres quien registró esta organización' })
  async createOrganizationPaymentSource(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreatePaymentSourceDto,
    @Req() req: Request,
  ) {
    const user = req['user'] as JwtPayload;
    return this.organizationBillingService.enableAutomaticPayment(organizationId, user.id, dto);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Crear transacción y obtener parámetros del Widget de Wompi' })
  @ApiResponse({ status: 201, description: 'Parámetros del Widget (incluida la firma de integridad) y externalReference' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 503, description: 'Wompi no disponible' })
  async createCheckout(@Body() dto: CreateCheckoutDto) {
    return this.paymentsService.createCheckout(dto);
  }

  @Post('license-checkout')
  @UseGuards(JWTAuthGuard, StepUpGuard)
  @RequireStepUp('marketplace.purchase.confirm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Iniciar pago de licencia para una solicitud aprobada con precio' })
  @ApiResponse({ status: 201, description: 'Parámetros del Widget de Wompi para el pago de licencia' })
  @ApiResponse({ status: 400, description: 'Solicitud inválida o sin precio establecido' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  async createLicenseCheckout(@Body() dto: CreateLicenseCheckoutDto, @Req() req: Request) {
    const user = req['user'] as JwtPayload;
    // §22/§23: la organización activa (header x-organization-id) es parte del
    // contexto de autorización. Si el comprador actúa como organización, se
    // resuelve la comisión B2B; el backend valida su tipo real en BD.
    const organizationId = resolveOrganizationId(req);
    return this.paymentsService.createLicenseCheckout(dto, user.id, organizationId);
  }

  @Post('license-installment-checkout')
  @UseGuards(JWTAuthGuard, StepUpGuard)
  @RequireStepUp('marketplace.purchase.confirm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Iniciar pago de una cuota de anticipo de un contrato de licencia de primer uso' })
  @ApiResponse({ status: 201, description: 'Parámetros del Widget de Wompi para el pago de la cuota' })
  @ApiResponse({ status: 400, description: 'Cuota inválida, ya pagada o no pertenece al usuario' })
  async createLicenseInstallmentCheckout(
    @Body() dto: CreateLicenseInstallmentCheckoutDto,
    @Req() req: Request,
  ) {
    const user = req['user'] as JwtPayload;
    return this.paymentsService.createLicenseInstallmentCheckout(dto, user.id);
  }

  @Get('license-quote/:requestedTrackId')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Preview del desglose de comisión de una licencia antes de pagar (§18)' })
  @ApiResponse({ status: 200, description: 'Desglose: precio, comisión, porcentaje y total' })
  async getLicenseQuote(@Param('requestedTrackId') requestedTrackId: string, @Req() req: Request) {
    const user = req['user'] as JwtPayload;
    const organizationId = resolveOrganizationId(req);
    return this.paymentsService.previewLicenseCommission(requestedTrackId, user.id, organizationId);
  }

  @Get('license-status/:reference')
  @ApiOperation({ summary: 'Consultar estado de pago de licencia por referencia' })
  @ApiResponse({ status: 200, description: 'Estado del pago de licencia' })
  async getLicensePaymentStatus(@Param('reference') reference: string) {
    return this.paymentsService.getLicensePaymentStatus(reference);
  }

  @Post('wompi/webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook de eventos de Wompi (transaction.updated)' })
  @ApiResponse({ status: 200, description: 'Evento procesado' })
  @ApiResponse({ status: 401, description: 'Firma de evento inválida' })
  async handleWebhook(@Body() event: ProviderEvent) {
    this.logger.log(`[Webhook Wompi] recibido — event=${event?.event}`);
    await this.paymentsService.handleWebhook(event);
    return { received: true };
  }

  @Get('status/:reference')
  @ApiOperation({ summary: 'Consultar estado de pago pendiente por referencia' })
  @ApiResponse({ status: 200, description: 'Estado del pago' })
  async getPaymentStatus(@Param('reference') reference: string) {
    return this.paymentsService.getPaymentStatus(reference);
  }

  @Post('payment-sources')
  @UseGuards(JWTAuthGuard, StepUpGuard)
  @RequireStepUp('account.payment_method.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tokenizar tarjeta y crear fuente de pago para cobros recurrentes' })
  @ApiResponse({ status: 201, description: 'Fuente de pago creada (solo marca y últimos 4 dígitos)' })
  @ApiResponse({ status: 503, description: 'Wompi no disponible' })
  async createPaymentSource(@Body() dto: CreatePaymentSourceDto, @Req() req: Request) {
    const user = req['user'] as JwtPayload;
    return this.paymentsService.createPaymentSource(user.id, dto);
  }

  @Get('payment-sources/me')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener fuente de pago activa del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Fuente de pago activa o null' })
  async getActivePaymentSource(@Req() req: Request) {
    const user = req['user'] as JwtPayload;
    return this.paymentsService.getActivePaymentSource(user.id);
  }

  @Delete('payment-sources/:id')
  @HttpCode(204)
  @UseGuards(JWTAuthGuard, StepUpGuard)
  @RequireStepUp('account.payment_method.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar fuente de pago del usuario autenticado' })
  @ApiResponse({ status: 204, description: 'Eliminada' })
  @ApiResponse({ status: 404, description: 'No encontrada o no pertenece al usuario' })
  async deletePaymentSource(@Param('id') id: string, @Req() req: Request) {
    const user = req['user'] as JwtPayload;
    await this.paymentsService.deletePaymentSource(user.id, id);
  }

  @Get(':id')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener detalle de un pago propio' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'No encontrado o no pertenece al usuario' })
  async getPaymentById(@Param('id') id: string, @Req() req: Request) {
    const user = req['user'] as JwtPayload;
    const payment = await this.paymentsService.getPaymentById(id, user.id);
    if (!payment) throw new NotFoundException('Pago no encontrado');
    return payment;
  }

  @Get(':id/receipt')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Descargar comprobante de pago en PDF' })
  @ApiResponse({ status: 200, description: 'PDF del comprobante', content: { 'application/pdf': {} } })
  @ApiResponse({ status: 404, description: 'Pago no encontrado o no pertenece al usuario' })
  @ApiResponse({ status: 422, description: 'El pago no está aprobado' })
  async downloadReceipt(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const user = req['user'] as JwtPayload;
    const pdfBuffer = await this.receiptService.generateReceipt(id, user.id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="comprobante-musila-${id.substring(0, 8)}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    return new StreamableFile(pdfBuffer);
  }
}
