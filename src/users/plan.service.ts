import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPlan } from './entities/user-plan.enum';
import { UserRole } from './entities/user-role.enum';
import { User } from './entities/user.entity';
import { Payment, PaymentStatus } from 'src/payments/entities/payment.entity';

const PLAN_FEATURES: Record<string, string[]> = {
  [`${UserRole.AUTOR}_${UserPlan.FREE}`]: ['Hasta 3 canciones'],
  [`${UserRole.AUTOR}_${UserPlan.PRO}`]: ['Canciones ilimitadas', 'Solicitudes ilimitadas recibidas'],
  [`${UserRole.CANTAUTOR}_${UserPlan.FREE}`]: ['Hasta 3 canciones', 'Hasta 3 solicitudes', 'Hasta 2 colaboradores', 'Hasta 1 playlist', 'Búsqueda ilimitada'],
  [`${UserRole.CANTAUTOR}_${UserPlan.PRO}`]: ['Canciones ilimitadas', 'Solicitudes ilimitadas', 'Hasta 5 colaboradores', 'Playlists ilimitadas', 'Búsqueda ilimitada'],
  [`${UserRole.INTERPRETE}_${UserPlan.FREE}`]: ['Hasta 3 solicitudes', 'Hasta 2 colaboradores', 'Hasta 1 playlist', 'Búsqueda ilimitada'],
  [`${UserRole.INTERPRETE}_${UserPlan.PRO}`]: ['Solicitudes ilimitadas', 'Hasta 5 colaboradores', 'Playlists ilimitadas', 'Búsqueda ilimitada', 'Acceso de por vida'],
};

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  async getPlanStatus(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const latestPayment = await this.paymentRepo.findOne({
      where: { userId, status: PaymentStatus.APPROVED },
      order: { createdAt: 'DESC' },
    });

    const now = new Date();
    const expiresAt = user.planExpiresAt ?? null;
    const isLifetime = user.plan === UserPlan.PRO && !expiresAt;
    const isExpired = expiresAt ? now > expiresAt : false;

    // Auto-degrade if expired
    if (isExpired && user.plan === UserPlan.PRO) {
      await this.userRepo.update(userId, { plan: UserPlan.FREE, planExpiresAt: undefined });
      user.plan = UserPlan.FREE;
      user.planExpiresAt = undefined;
    }

    let daysRemaining: number | null = null;
    if (expiresAt && !isLifetime && !isExpired) {
      daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    const features = PLAN_FEATURES[`${user.role}_${user.plan}`] ?? [];

    return {
      plan: user.plan,
      role: user.role,
      startDate: latestPayment?.createdAt ?? null,
      expiresAt: expiresAt,
      isLifetime,
      isExpired,
      daysRemaining,
      features,
    };
  }

  async getPaymentHistory(
    userId: string,
    page: number,
    limit: number,
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
}
