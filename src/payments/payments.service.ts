import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MercadoPagoConfig, Payment as MPPayment, Preference } from 'mercadopago';
import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserRole } from 'src/users/entities/user-role.enum';
import { User } from 'src/users/entities/user.entity';
import { LessThan, Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import * as crypto from 'crypto';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import {
  Payment,
  PaymentStatus,
  PaymentType,
} from './entities/payment.entity';
import {
  PendingRegistration,
  PendingRegistrationStatus,
} from './entities/pending-registration.entity';

const PLAN_PRICES: Record<UserRole, number> = {
  [UserRole.AUTOR]: 39900,
  [UserRole.CANTAUTOR]: 59900,
  [UserRole.INTERPRETE]: 249900,
  [UserRole.ADMIN]: 0,
  [UserRole.INVITADO]: 0,
  [UserRole.EDITOR]: 0,
};

const PLAN_NAMES: Record<UserRole, string> = {
  [UserRole.AUTOR]: 'Autor Pro — Canciones ilimitadas',
  [UserRole.CANTAUTOR]: 'Cantautor Pro — Licencias ilimitadas',
  [UserRole.INTERPRETE]: 'Intérprete Pro — Acceso de por vida',
  [UserRole.ADMIN]: '',
  [UserRole.INVITADO]: '',
  [UserRole.EDITOR]: '',
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly mp: MercadoPagoConfig;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PendingRegistration)
    private readonly pendingRepo: Repository<PendingRegistration>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    this.mp = new MercadoPagoConfig({
      accessToken: this.configService.get<string>('MP_ACCESS_TOKEN') ?? '',
    });
  }

  async createPreference(dto: CreatePreferenceDto) {
    const externalReference = uuid();
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'local');
    const isLocal = nodeEnv === 'local';
    const apiEndpoint = this.configService.get<string>('API_ENDPOINT', 'http://localhost:3001');
    const webApp = this.configService.get<string>(
      isLocal ? 'WEB_APP_LOCAL' : nodeEnv === 'production' ? 'WEB_APP_PRODUCTION' : 'WEB_APP_DEVELOPMENT',
      'http://localhost:3000',
    );
    const isLifetime = dto.role === UserRole.INTERPRETE;

    try {
      const preference = new Preference(this.mp);
      const result = await preference.create({
        body: {
          items: [
            {
              id: `${dto.role}-pro`,
              title: PLAN_NAMES[dto.role],
              quantity: 1,
              currency_id: 'COP',
              unit_price: PLAN_PRICES[dto.role],
            },
          ],
          external_reference: externalReference,
          notification_url: `${apiEndpoint}/payments/mercadopago/webhook`,
          back_urls: {
            success: `${webApp}/register/pro/pending?ref=${externalReference}`,
            failure: `${webApp}/register/pro/error?ref=${externalReference}`,
            pending: `${webApp}/register/pro/pending?ref=${externalReference}`,
          },
          ...(!isLocal && { auto_return: 'approved' }),
          payment_methods: {
            excluded_payment_types: [],
          },
          metadata: { role: dto.role, plan: dto.plan, isLifetime },
        },
      });

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);

      await this.pendingRepo.save({
        externalReference,
        role: dto.role,
        plan: UserPlan.PRO,
        status: PendingRegistrationStatus.PENDING,
        expiresAt,
      });

      return { initPoint: result.init_point, externalReference };
    } catch (err: any) {
      this.logger.error(
        `Error creating Mercado Pago preference: ${err?.message ?? err}`,
        err?.stack,
      );
      this.logger.error(`MP cause: ${JSON.stringify(err?.cause ?? err)}`);
      throw new ServiceUnavailableException('No se pudo iniciar el proceso de pago. Intenta nuevamente.');
    }
  }

  async handleWebhook(body: Record<string, any>, signature: string, requestId: string) {
    const secret = this.configService.get<string>('MP_WEBHOOK_SECRET', '');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'local');

    if (secret && nodeEnv !== 'local') {
      if (!this.verifyMpSignature(signature, requestId, String(body?.id ?? ''), secret)) {
        this.logger.warn(`[Webhook MP] firma inválida — signature=${signature}`);
        throw new UnauthorizedException('Firma de webhook inválida');
      }
    }

    this.logger.log(`[Webhook MP] procesando — type=${body?.type} data.id=${body?.data?.id}`);

    const { type, data } = body;

    if (type === 'payment' && data?.id) {
      await this.processPaymentEvent(String(data.id));
    } else if (type === 'subscription_authorized_payment') {
      await this.processSubscriptionCancellation(body);
    }
  }

  private verifyMpSignature(signature: string, requestId: string, notificationId: string, secret: string): boolean {
    try {
      const tsPart = signature.split(',').find(p => p.startsWith('ts='));
      const v1Part = signature.split(',').find(p => p.startsWith('v1='));
      if (!tsPart || !v1Part) return false;

      const ts = tsPart.split('=')[1];
      const v1 = v1Part.split('=')[1];
      const template = `id:${notificationId};request-id:${requestId};ts:${ts}`;
      const expected = crypto.createHmac('sha256', secret).update(template).digest('hex');
      return expected === v1;
    } catch {
      return false;
    }
  }

  private async processPaymentEvent(mpPaymentId: string) {
    try {
      const mpPayment = new MPPayment(this.mp);
      const paymentData = await mpPayment.get({ id: mpPaymentId });
      const externalRef = paymentData.external_reference;
      const status = paymentData.status as string;

      const pending = externalRef
        ? await this.pendingRepo.findOne({ where: { externalReference: externalRef } })
        : null;

      const paymentStatus = status === 'approved' ? PaymentStatus.APPROVED
        : status === 'rejected' ? PaymentStatus.REJECTED
        : PaymentStatus.PENDING;

      const isLifetime = pending?.role === UserRole.INTERPRETE;
      let expiresAt: Date | undefined;
      if (!isLifetime && paymentStatus === PaymentStatus.APPROVED) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
      }

      await this.paymentRepo.save({
        mercadoPagoPaymentId: mpPaymentId,
        userId: pending?.userId,
        status: paymentStatus,
        amount: paymentData.transaction_amount ?? undefined,
        currency: 'COP',
        planType: UserPlan.PRO,
        roleType: pending?.role ?? UserRole.INVITADO,
        paymentType: isLifetime ? PaymentType.ONE_TIME : PaymentType.SUBSCRIPTION,
        externalReference: externalRef ?? undefined,
        expiresAt,
      });

      if (paymentStatus === PaymentStatus.APPROVED && pending) {
        await this.pendingRepo.update(pending.id, {
          status: PendingRegistrationStatus.PAYMENT_CONFIRMED,
        });

        if (pending.userId) {
          await this.userRepo.update(pending.userId, { plan: UserPlan.PRO });
        }
      }
    } catch (err) {
      this.logger.error(`Error procesando pago ${mpPaymentId}`, err);
    }
  }

  private async processSubscriptionCancellation(body: Record<string, any>) {
    const status = body?.data?.status;
    if (status !== 'cancelled') return;

    const userId = body?.data?.payer_id;
    if (!userId) return;

    const user = await this.userRepo.findOne({ where: { id: String(userId) } });
    if (user) {
      await this.userRepo.update(user.id, { plan: UserPlan.FREE });
      await this.paymentRepo.save({
        userId: user.id,
        status: PaymentStatus.CANCELLED,
        currency: 'COP',
        planType: UserPlan.FREE,
        roleType: user.role,
        paymentType: PaymentType.SUBSCRIPTION,
      });
    }
  }

  async getPaymentStatus(reference: string) {
    this.logger.log(`[getPaymentStatus] consultando ref=${reference}`);

    const pending = await this.pendingRepo.findOne({
      where: { externalReference: reference },
    });

    if (!pending) {
      this.logger.warn(`[getPaymentStatus] PendingRegistration no encontrado para ref=${reference}`);
      return { status: 'not_found' };
    }

    this.logger.log(`[getPaymentStatus] pending.status=${pending.status} role=${pending.role}`);

    if (pending.status === PendingRegistrationStatus.PAYMENT_CONFIRMED) {
      return { status: 'approved', userId: pending.userId, plan: 'pro', role: pending.role };
    }

    if (pending.status === PendingRegistrationStatus.EXPIRED || new Date() > pending.expiresAt) {
      return { status: 'expired' };
    }

    // Fallback: webhook no llegó aún — consultar MP directamente sin hacer una segunda llamada
    try {
      this.logger.log(`[getPaymentStatus] buscando en MP por external_reference=${reference}`);
      const mpPayment = new MPPayment(this.mp);
      const search = await mpPayment.search({
        options: { external_reference: reference, status: 'approved', limit: 1 },
      });

      this.logger.log(`[getPaymentStatus] MP search results count=${search?.results?.length ?? 0}`);

      if (search?.results?.length) {
        const result = search.results[0];
        const mpStatus = result.status as string;
        this.logger.log(`[getPaymentStatus] pago encontrado id=${result.id} status=${mpStatus}`);

        if (mpStatus === 'approved') {
          const isLifetime = pending.role === UserRole.INTERPRETE;
          let expiresAt: Date | undefined;
          if (!isLifetime) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
          }

          await this.paymentRepo.save({
            mercadoPagoPaymentId: String(result.id),
            status: PaymentStatus.APPROVED,
            amount: result.transaction_amount ?? undefined,
            currency: 'COP',
            planType: UserPlan.PRO,
            roleType: pending.role,
            paymentType: isLifetime ? PaymentType.ONE_TIME : PaymentType.SUBSCRIPTION,
            externalReference: reference,
            expiresAt,
          });

          await this.pendingRepo.update(pending.id, {
            status: PendingRegistrationStatus.PAYMENT_CONFIRMED,
          });

          this.logger.log(`[getPaymentStatus] pago confirmado vía fallback para ref=${reference}`);
          return { status: 'approved', plan: 'pro', role: pending.role };
        }
      }
    } catch (err: any) {
      this.logger.error(`[getPaymentStatus] fallback MP search falló: ${err?.message}`, err?.stack);
    }

    return { status: 'pending' };
  }

  async linkUserToPayment(externalReference: string, userId: string): Promise<void> {
    const pending = await this.pendingRepo.findOne({
      where: { externalReference, status: PendingRegistrationStatus.PAYMENT_CONFIRMED },
    });
    if (!pending) return;

    await this.pendingRepo.update(pending.id, { userId });
    await this.userRepo.update(userId, { plan: UserPlan.PRO });
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
