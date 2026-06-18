import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserRole } from 'src/users/entities/user-role.enum';
import { User } from 'src/users/entities/user.entity';
import { LessThan, Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreateLicenseCheckoutDto } from './dto/create-license-checkout.dto';
import { CreatePaymentSourceDto } from './dto/create-payment-source.dto';
import {
  BillingPeriod,
  Payment,
  PaymentProviderName,
  PaymentStatus,
  PaymentType,
} from './entities/payment.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { LicensePaymentStatus } from 'src/requested-tracks/entities/license-payment-status.enum';
import { RequestsStatus } from 'src/requested-tracks/entities/requests-status.enum';
import { EventBusService } from 'src/shared/events/event-bus.service';
import {
  PaymentSource,
  PaymentSourceStatus,
} from './entities/payment-source.entity';
import {
  PendingRegistration,
  PendingRegistrationStatus,
} from './entities/pending-registration.entity';
import {
  PAYMENT_PROVIDER,
  PaymentProvider,
} from './domain/payment-provider.interface';
import {
  ParsedTransactionEvent,
  ProviderEvent,
  ProviderPaymentSourceStatus,
  ProviderTransactionStatus,
} from './domain/payment-provider.types';

const CURRENCY = 'COP';
const LICENSE_COMMISSION_RATE = 0.10;

const PLAN_PRICES: Record<UserRole, number> = {
  [UserRole.AUTOR]: 39900,
  [UserRole.CANTAUTOR]: 59900,
  [UserRole.INTERPRETE]: 39900,
  [UserRole.ADMIN]: 0,
  [UserRole.INVITADO]: 0,
  [UserRole.EDITOR]: 0,
};

const ANNUAL_PLAN_PRICES: Record<UserRole, number> = {
  [UserRole.AUTOR]: 359100,
  [UserRole.CANTAUTOR]: 539100,
  [UserRole.INTERPRETE]: 39900, // pago único, sin variación
  [UserRole.ADMIN]: 0,
  [UserRole.INVITADO]: 0,
  [UserRole.EDITOR]: 0,
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(PAYMENT_PROVIDER)
    private readonly provider: PaymentProvider,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PendingRegistration)
    private readonly pendingRepo: Repository<PendingRegistration>,
    @InjectRepository(PaymentSource)
    private readonly paymentSourceRepo: Repository<PaymentSource>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RequestedTrack)
    private readonly requestedTrackRepo: Repository<RequestedTrack>,
    private readonly eventBus: EventBusService,
  ) {}

  private webAppUrl(): string {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'local');
    const key =
      nodeEnv === 'production'
        ? 'WEB_APP_PRODUCTION'
        : nodeEnv === 'development'
          ? 'WEB_APP_DEVELOPMENT'
          : 'WEB_APP_LOCAL';
    return this.configService.get<string>(key, 'http://localhost:3000');
  }

  private resolveAmount(role: UserRole, billingPeriod?: string) {
    const isLifetime = role === UserRole.INTERPRETE;
    const isAnnual = billingPeriod === 'annual' && !isLifetime;
    const amountCop = isAnnual ? ANNUAL_PLAN_PRICES[role] : PLAN_PRICES[role];
    return {
      isLifetime,
      isAnnual,
      amountCop,
      amountInCents: amountCop * 100,
    };
  }

  // ─── Checkout (Widget) ─────────────────────────────────────────────────────────

  /**
   * Crea la transacción pendiente y devuelve los parámetros necesarios para
   * inicializar el Widget de Wompi (incluida la firma de integridad).
   */
  async createCheckout(dto: CreateCheckoutDto) {
    const reference = uuid();
    const { amountInCents } = this.resolveAmount(dto.role, dto.billingPeriod);

    if (amountInCents <= 0) {
      throw new ServiceUnavailableException('El plan seleccionado no está disponible.');
    }

    let signature: string;
    try {
      signature = this.provider.generateIntegritySignature({
        reference,
        amountInCents,
        currency: CURRENCY,
      });
    } catch (err: any) {
      this.logger.error(`[createCheckout] no se pudo generar la firma: ${err?.message}`);
      throw new ServiceUnavailableException('No se pudo iniciar el proceso de pago.');
    }

    const publicKey = this.configService.get<string>('WOMPI_PUBLIC_KEY', '');
    if (!publicKey) {
      this.logger.error('[createCheckout] WOMPI_PUBLIC_KEY no está configurado');
      throw new ServiceUnavailableException('No se pudo iniciar el proceso de pago.');
    }
    const redirectUrl = `${this.webAppUrl()}/register/pro/pending?ref=${reference}`;

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    try {
      await this.pendingRepo.save({
        externalReference: reference,
        role: dto.role,
        plan: UserPlan.PRO,
        status: PendingRegistrationStatus.PENDING,
        expiresAt,
      });
    } catch (err: any) {
      this.logger.error(
        `[createCheckout] error guardando pending registration: ${err?.message ?? err}`,
        err?.stack,
      );
      throw new InternalServerErrorException('Error al iniciar el proceso de pago. Por favor intenta de nuevo.');
    }

    return {
      widget: {
        publicKey,
        currency: CURRENCY,
        amountInCents,
        reference,
        signature,
        redirectUrl,
      },
      externalReference: reference,
    };
  }

  // ─── Checkout de licencia ─────────────────────────────────────────────────────

  async createLicenseCheckout(dto: CreateLicenseCheckoutDto, userId: string) {
    const track = await this.requestedTrackRepo.findOne({
      where: { id: dto.requestedTrackId },
      relations: ['requester', 'owner', 'track', 'chat'],
    });

    if (!track) throw new NotFoundException('Solicitud de licencia no encontrada');
    if (track.requester.id !== userId) throw new BadRequestException('Solo el solicitante puede iniciar el pago');
    if (!track.licensePrice) throw new BadRequestException('El propietario aún no ha establecido un precio');
    if (track.status !== RequestsStatus.PENDIENTE) throw new BadRequestException('Esta solicitud no está en estado pendiente');
    if (track.licensePaymentStatus === LicensePaymentStatus.APPROVED) throw new BadRequestException('Esta licencia ya fue pagada');

    const licensePriceInCents = Math.round(Number(track.licensePrice) * 100);
    const commissionInCents = Math.round(licensePriceInCents * LICENSE_COMMISSION_RATE);
    const amountInCents = licensePriceInCents + commissionInCents;
    const reference = uuid();

    let signature: string;
    try {
      signature = this.provider.generateIntegritySignature({ reference, amountInCents, currency: CURRENCY });
    } catch (err: any) {
      this.logger.error(`[createLicenseCheckout] error generando firma: ${err?.message}`);
      throw new ServiceUnavailableException('No se pudo iniciar el proceso de pago.');
    }

    const publicKey = this.configService.get<string>('WOMPI_PUBLIC_KEY', '');
    if (!publicKey) throw new ServiceUnavailableException('No se pudo iniciar el proceso de pago.');

    const redirectUrl = `${this.webAppUrl()}/music/solicitudes?ref=${reference}`;

    track.licensePaymentReference = reference;
    track.licensePaymentStatus = LicensePaymentStatus.PENDING;
    await this.requestedTrackRepo.save(track);

    await this.paymentRepo.save({
      provider: PaymentProviderName.WOMPI,
      userId,
      status: PaymentStatus.PENDING,
      amount: amountInCents / 100,
      currency: CURRENCY,
      planType: UserPlan.FREE,
      roleType: UserRole.INVITADO,
      paymentType: PaymentType.LICENSE,
      externalReference: reference,
      requestedTrackId: track.id,
    });

    return {
      widget: { publicKey, currency: CURRENCY, amountInCents, reference, signature, redirectUrl },
      externalReference: reference,
      licensePrice: Number(track.licensePrice),
      commission: commissionInCents / 100,
      total: amountInCents / 100,
    };
  }

  async getLicensePaymentStatus(reference: string) {
    const track = await this.requestedTrackRepo.findOne({
      where: { licensePaymentReference: reference },
    });

    if (!track) return { status: 'not_found' };

    switch (track.licensePaymentStatus) {
      case LicensePaymentStatus.APPROVED:
        return { status: 'approved', requestedTrackId: track.id };
      case LicensePaymentStatus.FAILED:
        return { status: 'failed', requestedTrackId: track.id };
      case LicensePaymentStatus.PENDING:
        return { status: 'pending' };
      default:
        return { status: 'not_found' };
    }
  }

  // ─── Webhook ───────────────────────────────────────────────────────────────────

  /**
   * Procesa un evento de Wompi. Valida la firma, garantiza idempotencia por
   * `wompiTransactionId` y actualiza el estado de la transacción.
   */
  async handleWebhook(event: ProviderEvent) {
    const parsed = this.provider.verifyAndParseEvent(event);
    if (!parsed) {
      this.logger.warn('[Webhook Wompi] firma inválida o evento no manejado');
      throw new UnauthorizedException('Firma de webhook inválida');
    }

    this.logger.log(
      `[Webhook Wompi] tx=${parsed.transactionId} ref=${parsed.reference} status=${parsed.status}`,
    );

    // Idempotencia: si la transacción ya fue procesada como APPROVED, no reprocesar.
    const existing = await this.paymentRepo.findOne({
      where: { wompiTransactionId: parsed.transactionId },
    });
    if (existing && existing.status === PaymentStatus.APPROVED) {
      this.logger.log(`[Webhook Wompi] evento duplicado para tx=${parsed.transactionId}, ignorado`);
      return;
    }

    const pending = await this.pendingRepo.findOne({
      where: { externalReference: parsed.reference },
    });

    // Si no hay PendingRegistration, puede ser un pago de licencia
    if (!pending) {
      const licenseTrack = await this.requestedTrackRepo.findOne({
        where: { licensePaymentReference: parsed.reference },
        relations: ['requester', 'owner', 'track', 'chat'],
      });
      if (licenseTrack) {
        await this.handleLicensePayment(parsed, licenseTrack);
        return;
      }
      this.logger.warn(`[Webhook Wompi] no se encontró pending ni licencia para ref=${parsed.reference}`);
      return;
    }

    const paymentStatus = this.mapStatus(parsed.status);
    const isLifetime = pending?.role === UserRole.INTERPRETE;

    let expiresAt: Date | undefined;
    let billingPeriod: BillingPeriod | undefined;
    if (paymentStatus === PaymentStatus.APPROVED && !isLifetime) {
      const isAnnual =
        parsed.amountInCents != null &&
        pending?.role != null &&
        parsed.amountInCents >= ANNUAL_PLAN_PRICES[pending.role] * 100;
      billingPeriod = isAnnual ? BillingPeriod.ANNUAL : BillingPeriod.MONTHLY;
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (isAnnual ? 365 : 30));
    }

    const paymentData: Partial<Payment> = {
      provider: PaymentProviderName.WOMPI,
      wompiTransactionId: parsed.transactionId,
      userId: pending?.userId,
      status: paymentStatus,
      amount: parsed.amountInCents != null ? parsed.amountInCents / 100 : undefined,
      currency: CURRENCY,
      planType: UserPlan.PRO,
      roleType: pending?.role ?? UserRole.INVITADO,
      paymentType: isLifetime ? PaymentType.ONE_TIME : PaymentType.SUBSCRIPTION,
      billingPeriod,
      externalReference: parsed.reference,
      expiresAt,
    };

    if (existing) {
      await this.paymentRepo.update(existing.id, paymentData);
    } else {
      await this.paymentRepo.save(paymentData);
    }

    if (paymentStatus === PaymentStatus.APPROVED && pending) {
      await this.pendingRepo.update(pending.id, {
        status: PendingRegistrationStatus.PAYMENT_CONFIRMED,
      });
      if (pending.userId) {
        await this.userRepo.update(pending.userId, {
          plan: UserPlan.PRO,
          planExpiresAt: expiresAt,
        });
      }
      this.logger.log(`[Webhook Wompi] registro ${pending.id} confirmado`);
    }
  }

  private async handleLicensePayment(
    parsed: ParsedTransactionEvent,
    track: RequestedTrack,
  ): Promise<void> {
    const paymentStatus = this.mapStatus(parsed.status);

    const existingPayment = await this.paymentRepo.findOne({
      where: { wompiTransactionId: parsed.transactionId },
    });
    if (existingPayment && existingPayment.status === PaymentStatus.APPROVED) {
      this.logger.log(`[Webhook License] evento duplicado tx=${parsed.transactionId}, ignorado`);
      return;
    }

    const paymentData: Partial<Payment> = {
      provider: PaymentProviderName.WOMPI,
      wompiTransactionId: parsed.transactionId,
      userId: track.requester?.id,
      status: paymentStatus,
      amount: parsed.amountInCents != null ? parsed.amountInCents / 100 : undefined,
      currency: CURRENCY,
      planType: UserPlan.FREE,
      roleType: UserRole.INVITADO,
      paymentType: PaymentType.LICENSE,
      externalReference: parsed.reference,
      requestedTrackId: track.id,
    };

    if (existingPayment) {
      await this.paymentRepo.update(existingPayment.id, paymentData);
    } else {
      await this.paymentRepo.save(paymentData);
    }

    if (paymentStatus === PaymentStatus.APPROVED) {
      track.licensePaymentStatus = LicensePaymentStatus.APPROVED;
      track.status = RequestsStatus.APROBADA;
      await this.requestedTrackRepo.save(track);
      this.logger.log(`[Webhook License] licencia aprobada para solicitud ${track.id}`);
      this.eventBus.emit('track.request.license.approved', {
        requestId: track.id,
        chatId: track.chat?.id || '',
        trackTitle: track.track?.title || '',
        requesterId: track.requester?.id || '',
        ownerId: track.owner?.id || '',
      });
    } else if (paymentStatus === PaymentStatus.REJECTED || paymentStatus === PaymentStatus.CANCELLED) {
      track.licensePaymentStatus = LicensePaymentStatus.FAILED;
      await this.requestedTrackRepo.save(track);
      this.logger.log(`[Webhook License] pago fallido para solicitud ${track.id}`);
    }
  }

  private mapStatus(status: ProviderTransactionStatus): PaymentStatus {
    switch (status) {
      case ProviderTransactionStatus.APPROVED:
        return PaymentStatus.APPROVED;
      case ProviderTransactionStatus.VOIDED:
        return PaymentStatus.CANCELLED;
      case ProviderTransactionStatus.DECLINED:
      case ProviderTransactionStatus.ERROR:
        return PaymentStatus.REJECTED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  // ─── Estado / polling ────────────────────────────────────────────────────────

  async getPaymentStatus(reference: string) {
    const pending = await this.pendingRepo.findOne({
      where: { externalReference: reference },
    });

    if (!pending) return { status: 'not_found' };

    if (pending.status === PendingRegistrationStatus.PAYMENT_CONFIRMED) {
      return { status: 'approved', userId: pending.userId, plan: 'pro', role: pending.role };
    }

    if (pending.status === PendingRegistrationStatus.EXPIRED || new Date() > pending.expiresAt) {
      return { status: 'expired' };
    }

    return { status: 'pending' };
  }

  // ─── Tokenización / fuente de pago recurrente ──────────────────────────────────

  /**
   * Tokeniza la tarjeta y crea una fuente de pago en Wompi, almacenando solo el
   * payment_source_id y datos no sensibles (marca, últimos 4 dígitos).
   * Modelo una-tarjeta-activa: elimina fuentes AVAILABLE previas del usuario.
   */
  async createPaymentSource(userId: string, dto: CreatePaymentSourceDto) {
    // One-card model: remove previous available sources before creating
    await this.paymentSourceRepo.delete({ userId, status: PaymentSourceStatus.AVAILABLE });

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
      userId,
      wompiPaymentSourceId: source.paymentSourceId,
      brand: token.brand,
      last4: token.last4,
      status: source.status === ProviderPaymentSourceStatus.AVAILABLE
        ? PaymentSourceStatus.AVAILABLE
        : source.status === ProviderPaymentSourceStatus.ERROR
          ? PaymentSourceStatus.ERROR
          : PaymentSourceStatus.PENDING,
      acceptanceTokenAccepted: true,
    });

    return {
      id: saved.id,
      brand: saved.brand,
      last4: saved.last4,
      status: saved.status,
    };
  }

  /** Devuelve la fuente de pago activa del usuario, o null si no tiene. */
  async getActivePaymentSource(userId: string) {
    const source = await this.paymentSourceRepo.findOne({
      where: { userId, status: PaymentSourceStatus.AVAILABLE },
      order: { createdAt: 'DESC' },
    });
    if (!source) return null;
    return { id: source.id, brand: source.brand, last4: source.last4 };
  }

  /** Elimina una fuente de pago verificando que pertenezca al usuario. */
  async deletePaymentSource(userId: string, id: string) {
    const source = await this.paymentSourceRepo.findOne({ where: { id, userId } });
    if (!source) throw new NotFoundException('Fuente de pago no encontrada');
    await this.paymentSourceRepo.delete(id);
  }

  /**
   * Cobra una suscripción recurrente usando una fuente de pago previamente
   * tokenizada. Actualiza planExpiresAt del usuario si el cobro es aprobado.
   */
  async chargeRecurring(
    userId: string,
    paymentSourceId: string,
    role: UserRole,
    billingPeriod: BillingPeriod = BillingPeriod.MONTHLY,
  ) {
    const source = await this.paymentSourceRepo.findOne({
      where: { id: paymentSourceId, userId },
    });
    if (!source) {
      throw new ServiceUnavailableException('Fuente de pago no encontrada');
    }

    const reference = uuid();
    const { amountInCents } = this.resolveAmount(role, billingPeriod);
    const user = await this.userRepo.findOne({ where: { id: userId } });

    const result = await this.provider.chargeRecurring({
      reference,
      amountInCents,
      currency: CURRENCY,
      customerEmail: user?.email ?? '',
      paymentSourceId: source.wompiPaymentSourceId,
    });

    const paymentStatus = this.mapStatus(result.status);
    const isApproved = paymentStatus === PaymentStatus.APPROVED;

    const days = billingPeriod === BillingPeriod.ANNUAL ? 365 : 30;
    const baseDate =
      user?.planExpiresAt && user.planExpiresAt > new Date() ? user.planExpiresAt : new Date();
    const newExpiry = new Date(baseDate);
    newExpiry.setDate(newExpiry.getDate() + days);

    await this.paymentRepo.save({
      provider: PaymentProviderName.WOMPI,
      wompiTransactionId: result.transactionId,
      paymentSourceId: source.id,
      userId,
      status: paymentStatus,
      amount: amountInCents / 100,
      currency: CURRENCY,
      planType: UserPlan.PRO,
      roleType: role,
      paymentType: PaymentType.SUBSCRIPTION,
      billingPeriod,
      externalReference: reference,
      expiresAt: isApproved ? newExpiry : undefined,
    });

    if (isApproved) {
      await this.userRepo.update(userId, { plan: UserPlan.PRO, planExpiresAt: newExpiry });
    }

    return { transactionId: result.transactionId, status: result.status, isApproved, newExpiry };
  }

  // ─── Resto del ciclo de vida (sin cambios funcionales) ─────────────────────────

  async linkUserToPayment(externalReference: string, userId: string): Promise<void> {
    const pending = await this.pendingRepo.findOne({
      where: { externalReference, status: PendingRegistrationStatus.PAYMENT_CONFIRMED },
    });
    if (!pending) return;

    // Vincular el registro de pago al usuario para que aparezca en el historial
    await this.paymentRepo.update({ externalReference }, { userId });
    await this.pendingRepo.update(pending.id, { userId });

    // Tomar la fecha de expiración del pago aprobado
    const payment = await this.paymentRepo.findOne({
      where: { externalReference, status: PaymentStatus.APPROVED },
    });

    await this.userRepo.update(userId, {
      plan: UserPlan.PRO,
      planExpiresAt: payment?.expiresAt ?? undefined,
    });
  }

  async getHistory(
    userId: string,
    page = 1,
    limit = 10,
    status?: PaymentStatus,
    from?: string,
    to?: string,
  ) {
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;

    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .where('p.userId = :userId', { userId })
      .orderBy('p.created_at', 'DESC')
      .take(take)
      .skip(skip);

    if (status) qb.andWhere('p.status = :status', { status });
    if (from) qb.andWhere('p.created_at >= :from', { from: new Date(from) });
    if (to) qb.andWhere('p.created_at <= :to', { to: new Date(to) });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit: take };
  }

  async getPaymentById(paymentId: string, userId: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment || payment.userId !== userId) return null;
    return payment;
  }

  async cleanupExpiredPendingRegistrations() {
    await this.pendingRepo.update(
      {
        status: PendingRegistrationStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
      { status: PendingRegistrationStatus.EXPIRED },
    );
  }

}
