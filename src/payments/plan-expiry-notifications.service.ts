import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { UserPlan } from 'src/users/entities/user-plan.enum';
import { Notification } from 'src/notifications/entities/notification.entity';
import { EmailService } from 'src/shared/mail/services/email.service';
import { ConfigService } from '@nestjs/config';

const NOTIFICATION_TYPE = 'plan_expiry_warning';

@Injectable()
export class PlanExpiryNotificationsService {
  private readonly logger = new Logger(PlanExpiryNotificationsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /** Corre cada día a las 15:00 UTC (10:00 AM Colombia UTC-5) */
  @Cron('0 15 * * *')
  async handleDailyCheck() {
    this.logger.log('[PlanExpiry] Ejecutando chequeo diario de planes próximos a vencer');
    await this.notifyAtDays(7);
    await this.notifyAtDays(1);
  }

  async notifyAtDays(daysAhead: number) {
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() + daysAhead);
    windowStart.setHours(0, 0, 0, 0);

    const windowEnd = new Date(windowStart);
    windowEnd.setHours(23, 59, 59, 999);

    const expiringUsers = await this.userRepo.find({
      where: {
        plan: UserPlan.PRO,
        planExpiresAt: Between(windowStart, windowEnd),
      },
    });

    this.logger.log(`[PlanExpiry] ${expiringUsers.length} usuarios vencen en ${daysAhead} días`);

    for (const user of expiringUsers) {
      await this.notifyUser(user, daysAhead);
    }
  }

  private async notifyUser(user: User, daysRemaining: number) {
    // Idempotencia: verificar si ya existe notificación hoy para este usuario y este umbral
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const exists = await this.notificationRepo.findOne({
      where: {
        type: NOTIFICATION_TYPE,
        data: { daysRemaining } as any,
        recipient: { id: user.id },
      },
    });

    if (exists) {
      this.logger.log(`[PlanExpiry] notificación ya enviada a userId=${user.id} daysRemaining=${daysRemaining}`);
      return;
    }

    const planName = 'Musila Pro';
    const webApp = this.configService.get<string>('WEB_APP_LOCAL', 'http://localhost:3000');
    const renewUrl = `${webApp}/#pricing`;

    // 1. Notificación in-app
    await this.notificationRepo.save({
      recipient: { id: user.id },
      title: daysRemaining === 1 ? 'Tu plan vence mañana' : `Tu plan vence en ${daysRemaining} días`,
      message: daysRemaining === 1
        ? `Tu suscripción a ${planName} vence mañana. Renueva para no perder el acceso.`
        : `Tu suscripción a ${planName} vence en ${daysRemaining} días. Renueva ahora y continúa disfrutando sin interrupciones.`,
      type: NOTIFICATION_TYPE,
      link: '/#pricing',
      data: { daysRemaining },
    });

    // 2. Correo
    try {
      await this.emailService.sendEmail({
        to: user.email,
        templateId: 'plan-expiry-warning',
        variables: {
          userName: user.name,
          daysRemaining,
          planName,
          renewUrl,
        },
      });
    } catch (err) {
      this.logger.error(`[PlanExpiry] error enviando email a ${user.email}: ${(err)?.message}`);
    }
  }
}
