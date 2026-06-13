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
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreateLicenseCheckoutDto } from './dto/create-license-checkout.dto';
import { CreatePaymentSourceDto } from './dto/create-payment-source.dto';
import { PaymentsService } from './payments.service';
import { ReceiptService } from './receipt.service';
import { ProviderEvent } from './domain/payment-provider.types';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly receiptService: ReceiptService,
  ) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Crear transacción y obtener parámetros del Widget de Wompi' })
  @ApiResponse({ status: 201, description: 'Parámetros del Widget (incluida la firma de integridad) y externalReference' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 503, description: 'Wompi no disponible' })
  async createCheckout(@Body() dto: CreateCheckoutDto) {
    return this.paymentsService.createCheckout(dto);
  }

  @Post('license-checkout')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Iniciar pago de licencia para una solicitud aprobada con precio' })
  @ApiResponse({ status: 201, description: 'Parámetros del Widget de Wompi para el pago de licencia' })
  @ApiResponse({ status: 400, description: 'Solicitud inválida o sin precio establecido' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  async createLicenseCheckout(@Body() dto: CreateLicenseCheckoutDto, @Req() req: Request) {
    const user = req['user'] as JwtPayload;
    return this.paymentsService.createLicenseCheckout(dto, user.id);
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
  @UseGuards(JWTAuthGuard)
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
  @UseGuards(JWTAuthGuard)
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
