import { randomUUID } from 'crypto';
import {
  ForbiddenException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreatePaymentSourceDto } from './dto/create-payment-source.dto';
import { PAYMENT_PROVIDER, PaymentProvider } from './domain/payment-provider.interface';
import { ProviderPaymentSourceStatus, ProviderTransactionStatus } from './domain/payment-provider.types';
import {
  OrganizationBillingRequest,
  OrganizationBillingRequestStatus,
} from './entities/organization-billing-request.entity';
import { PaymentSource, PaymentSourceStatus } from './entities/payment-source.entity';

/**
 * Checkout y confirmación de pago del registro legal B2B (§Registro Legal
 * B2B, pasos 3-5). Vive en `payments/` porque depende de `PAYMENT_PROVIDER`
 * (Wompi); la orquestación del estado de la organización vive en
 * `OrganizationsService` (importado desde `OrganizationsModule`, un único
 * sentido: payments → organizations, sin dependencia circular).
 */
@Injectable()
export class OrganizationBillingService {
  private readonly logger = new Logger(OrganizationBillingService.name);

  constructor(
    @InjectRepository(OrganizationBillingRequest)
    private readonly billingRequestRepo: Repository<OrganizationBillingRequest>,
    @InjectRepository(PaymentSource)
    private readonly paymentSourceRepo: Repository<PaymentSource>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly configService: ConfigService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  /**
   * Params del Wompi Widget para la solicitud de cobro PENDING más reciente
   * de la organización. Solo quien envió el `createBusinessForm` puede
   * consultarlo (§3).
   */
  async getCheckoutWidget(organizationId: string, userId: string) {
    const organization = await this.organizationsService.findById(organizationId);
    if (organization.registeredByUserId !== userId) {
      throw new ForbiddenException('No puedes ver el cobro de esta organización');
    }

    const billingRequest = await this.billingRequestRepo.findOne({
      where: { organizationId, status: OrganizationBillingRequestStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
    if (!billingRequest) {
      throw new NotFoundException('No hay un cobro pendiente para esta organización');
    }
    if (billingRequest.amountInCents == null) {
      throw new NotFoundException(
        'Esta organización tiene un plan sin precio configurado; el pago se valida manualmente',
      );
    }

    let signature: string;
    try {
      signature = this.provider.generateIntegritySignature({
        reference: billingRequest.externalReference,
        amountInCents: billingRequest.amountInCents,
        currency: billingRequest.currency,
      });
    } catch (err: any) {
      this.logger.error(`[getCheckoutWidget] no se pudo generar la firma: ${err?.message}`);
      throw new ServiceUnavailableException('No se pudo iniciar el proceso de pago.');
    }

    const publicKey = this.configService.get<string>('WOMPI_PUBLIC_KEY', '');
    if (!publicKey) {
      throw new ServiceUnavailableException('No se pudo iniciar el proceso de pago.');
    }

    return {
      widget: {
        publicKey,
        currency: billingRequest.currency,
        amountInCents: billingRequest.amountInCents,
        reference: billingRequest.externalReference,
        signature,
        redirectUrl: `${this.webAppUrl()}/org/${organizationId}/activate`,
      },
      externalReference: billingRequest.externalReference,
    };
  }

  /**
   * Escucha `payment.webhook.unmatched` (emitido por `PaymentsService` cuando
   * la referencia no corresponde a suscripción/licencia/pauta) e intenta
   * casarla con una `OrganizationBillingRequest`. Confirmado el pago,
   * transiciona la organización a CREADA (§5) — desacopla `PaymentsModule` de
   * `OrganizationsModule` en el sentido inverso.
   */
  async handleWebhookPayment(reference: string, status: string): Promise<void> {
    const billingRequest = await this.billingRequestRepo.findOne({ where: { externalReference: reference } });
    if (!billingRequest) return;

    if (status !== (ProviderTransactionStatus.APPROVED as string)) {
      billingRequest.status = OrganizationBillingRequestStatus.FAILED;
      await this.billingRequestRepo.save(billingRequest);
      this.logger.warn(`[OrganizationBilling] pago no aprobado ref=${reference} status=${status}`);
      return;
    }

    billingRequest.status = OrganizationBillingRequestStatus.PAYMENT_CONFIRMED;
    await this.billingRequestRepo.save(billingRequest);

    await this.organizationsService.markOrganizationCreatedFromPayment(billingRequest.organizationId);
    this.logger.log(`[OrganizationBilling] organización ${billingRequest.organizationId} → CREADA (ref=${reference})`);
  }

  /**
   * Tokeniza la tarjeta de la organización para habilitar el pago automático
   * recurrente (§3). Solo quien registró la organización puede configurarlo.
   * Modelo de una sola tarjeta: reemplaza cualquier fuente AVAILABLE previa.
   */
  async enableAutomaticPayment(organizationId: string, userId: string, dto: CreatePaymentSourceDto) {
    const organization = await this.organizationsService.findById(organizationId);
    if (organization.registeredByUserId !== userId) {
      throw new ForbiddenException('No puedes configurar el pago de esta organización');
    }

    await this.paymentSourceRepo.delete({ organizationId, status: PaymentSourceStatus.AVAILABLE });

    const acceptanceToken = await this.provider.getAcceptanceToken();
    const token = await this.provider.tokenizeCard({
      number: dto.number,
      cvc: dto.cvc,
      expMonth: dto.expMonth,
      expYear: dto.expYear,
      cardHolder: dto.cardHolder,
    });
    const source = await this.provider.createPaymentSource({
      type: 'CARD',
      token: token.tokenId,
      customerEmail: dto.customerEmail,
      acceptanceToken,
    });

    const saved = await this.paymentSourceRepo.save({
      organizationId,
      wompiPaymentSourceId: source.paymentSourceId,
      brand: token.brand,
      last4: token.last4,
      status:
        source.status === ProviderPaymentSourceStatus.AVAILABLE
          ? PaymentSourceStatus.AVAILABLE
          : source.status === ProviderPaymentSourceStatus.ERROR
            ? PaymentSourceStatus.ERROR
            : PaymentSourceStatus.PENDING,
      acceptanceTokenAccepted: true,
    });

    return { id: saved.id, brand: saved.brand, last4: saved.last4, status: saved.status };
  }

  /**
   * Cobra `amountInCents` a la fuente de pago tokenizada de la organización
   * (usado por el cron de renovación, §9). `null` si no tiene tarjeta activa.
   */
  async chargeRecurringForOrganization(
    organizationId: string,
    amountInCents: number,
    currency: string,
  ): Promise<{ approved: boolean } | null> {
    const source = await this.paymentSourceRepo.findOne({
      where: { organizationId, status: PaymentSourceStatus.AVAILABLE },
    });
    if (!source) return null;

    const organization = await this.organizationsService.findById(organizationId);
    const registrant = organization.registeredByUserId
      ? await this.userRepo.findOne({ where: { id: organization.registeredByUserId } })
      : null;

    const result = await this.provider.chargeRecurring({
      reference: `org-renewal-${organizationId}-${randomUUID()}`,
      amountInCents,
      currency,
      customerEmail: registrant?.email ?? '',
      paymentSourceId: source.wompiPaymentSourceId,
    });

    return { approved: result.status === ProviderTransactionStatus.APPROVED };
  }

  private webAppUrl(): string {
    return (
      this.configService.get<string>('WEB_APP_DEVELOPMENT') ||
      this.configService.get<string>('WEB_APP_PRODUCTION') ||
      this.configService.get<string>('WEB_APP_LOCAL') ||
      ''
    );
  }
}
