import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserRole } from 'src/users/entities/user-role.enum';
import { BillingPeriod, Payment, PaymentStatus } from './entities/payment.entity';
import { PaymentSource, PaymentSourceStatus } from './entities/payment-source.entity';
import { Notification } from 'src/notifications/entities/notification.entity';
import { EmailService } from 'src/shared/mail/services/email.service';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';

@Injectable()
export class SubscriptionRenewalService {
  private readonly logger = new Logger(SubscriptionRenewalService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentSource)
    private readonly paymentSourceRepo: Repository<PaymentSource>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly paymentsService: PaymentsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /** Runs daily at 14:00 UTC (9 AM Colombia), 1 h before the expiry-warning cron. */
  @Cron('0 14 * * *')
  async handleDailyRenewals() {
    this.logger.log('[SubscriptionRenewal] Iniciando renovaciones automáticas');

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const expiringUsers = await this.userRepo.find({
      where: {
        plan: UserPlan.PRO,
        role: In([UserRole.AUTOR, UserRole.CANTAUTOR]),
        planExpiresAt: Between(todayStart, todayEnd),
      },
    });

    this.logger.log(
      `[SubscriptionRenewal] ${expiringUsers.length} usuarios con plan venciendo hoy`,
    );

    for (const user of expiringUsers) {
      await this.renewUser(user);
    }
  }

  private async renewUser(user: User) {
    const source = await this.paymentSourceRepo.findOne({
      where: { userId: user.id, status: PaymentSourceStatus.AVAILABLE },
      order: { createdAt: 'DESC' },
    });

    if (!source) {
      this.logger.log(
        `[SubscriptionRenewal] userId=${user.id} sin tarjeta activa — plan vencerá normalmente`,
      );
      return;
    }

    const lastPayment = await this.paymentRepo.findOne({
      where: { userId: user.id, status: PaymentStatus.APPROVED },
      order: { createdAt: 'DESC' },
    });
    const billingPeriod = lastPayment?.billingPeriod ?? BillingPeriod.MONTHLY;

    try {
      const result = await this.paymentsService.chargeRecurring(
        user.id,
        source.id,
        user.role,
        billingPeriod,
      );

      if (result.isApproved) {
        this.logger.log(
          `[SubscriptionRenewal] userId=${user.id} renovado hasta ${result.newExpiry?.toISOString()}`,
        );
        await this.notifySuccess(user, billingPeriod, result.newExpiry);
      } else {
        this.logger.warn(
          `[SubscriptionRenewal] userId=${user.id} cobro no aprobado (status=${result.status})`,
        );
        await this.notifyFailed(user);
      }
    } catch (err: any) {
      this.logger.error(`[SubscriptionRenewal] userId=${user.id} error: ${err?.message}`);
      await this.notifyFailed(user);
    }
  }

  private async notifySuccess(user: User, billingPeriod: BillingPeriod, newExpiry?: Date) {
    const webApp = this.configService.get<string>('WEB_APP_LOCAL', 'http://localhost:3000');
    const periodLabel = billingPeriod === BillingPeriod.ANNUAL ? 'anual' : 'mensual';
    const expiryStr = newExpiry?.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    await this.notificationRepo.save({
      recipient: { id: user.id },
      title: 'Suscripción renovada',
      message: `Tu plan Pro (${periodLabel}) fue renovado exitosamente${expiryStr ? ` hasta el ${expiryStr}` : ''}.`,
      type: 'subscription_renewed',
      link: '/music/mi-cuenta?tab=pagos',
      data: { billingPeriod, newExpiry },
    });

    try {
      await this.emailService.sendEmail({
        to: user.email,
        templateId: 'subscription-renewed',
        variables: {
          userName: user.name,
          periodLabel,
          newExpiry: expiryStr,
          accountUrl: `${webApp}/music/mi-cuenta?tab=pagos`,
        },
      });
    } catch (err) {
      this.logger.error(
        `[SubscriptionRenewal] error enviando email de éxito a ${user.email}: ${(err)?.message}`,
      );
    }
  }

  private async notifyFailed(user: User) {
    const webApp = this.configService.get<string>('WEB_APP_LOCAL', 'http://localhost:3000');

    await this.notificationRepo.save({
      recipient: { id: user.id },
      title: 'No se pudo renovar tu suscripción',
      message: 'El cobro automático falló. Verifica tu medio de pago en Mi Cuenta.',
      type: 'subscription_renewal_failed',
      link: '/music/mi-cuenta?tab=facturacion',
      data: {},
    });

    try {
      await this.emailService.sendEmail({
        to: user.email,
        templateId: 'subscription-renewal-failed',
        variables: {
          userName: user.name,
          billingUrl: `${webApp}/music/mi-cuenta?tab=facturacion`,
        },
      });
    } catch (err) {
      this.logger.error(
        `[SubscriptionRenewal] error enviando email de fallo a ${user.email}: ${(err)?.message}`,
      );
    }
  }
}
