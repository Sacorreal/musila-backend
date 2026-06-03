import {
  Body,
  Controller,
  Get,
  Headers,
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
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { CreatePsePaymentDto } from './dto/create-pse-payment.dto';
import { PaymentsService } from './payments.service';
import { ReceiptService } from './receipt.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly receiptService: ReceiptService,
  ) {}

  @Post('create-preference')
  @ApiOperation({ summary: 'Crear preferencia de pago en Mercado Pago' })
  @ApiResponse({ status: 201, description: 'Preferencia creada — retorna initPoint y externalReference' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 503, description: 'Mercado Pago no disponible' })
  async createPreference(@Body() dto: CreatePreferenceDto) {
    return this.paymentsService.createPreference(dto);
  }

  @Post('mercadopago/webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook de notificación de Mercado Pago' })
  @ApiResponse({ status: 200, description: 'Evento procesado' })
  @ApiResponse({ status: 401, description: 'Firma inválida' })
  async handleWebhook(
    @Body() body: Record<string, any>,
    @Headers('x-signature') signature: string,
    @Headers('x-request-id') requestId: string,
  ) {
    this.logger.log(`[Webhook MP] recibido — type=${body?.type} data.id=${body?.data?.id} requestId=${requestId}`);
    await this.paymentsService.handleWebhook(body, signature, requestId);
    return { received: true };
  }

  @Get('status/:reference')
  @ApiOperation({ summary: 'Consultar estado de pago pendiente' })
  @ApiResponse({ status: 200, description: 'Estado del pago' })
  async getPaymentStatus(@Param('reference') reference: string) {
    return this.paymentsService.getPaymentStatus(reference);
  }

  @Get('pse/banks')
  @ApiOperation({ summary: 'Obtener entidades bancarias disponibles para PSE' })
  @ApiResponse({ status: 200, description: 'Lista de bancos PSE' })
  async getPseBanks() {
    return this.paymentsService.getPseBanks();
  }

  @Post('pse')
  @ApiOperation({ summary: 'Crear pago PSE — retorna URL de redirección al banco' })
  @ApiResponse({ status: 201, description: 'URL de redirección al banco y referencia externa' })
  @ApiResponse({ status: 503, description: 'Mercado Pago no disponible' })
  async createPsePayment(@Body() dto: CreatePsePaymentDto) {
    return this.paymentsService.createPsePayment(dto);
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

  @Post('payment-methods/tokenize')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @HttpCode(503)
  @ApiOperation({ summary: 'Tokenizar método de pago (próximamente)' })
  tokenize() {
    return { message: 'Funcionalidad no disponible aún' };
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
