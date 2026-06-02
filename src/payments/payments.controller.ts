import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Logger,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);
  constructor(private readonly paymentsService: PaymentsService) {}

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
}
