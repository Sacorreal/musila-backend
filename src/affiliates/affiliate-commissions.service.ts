import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import { User } from 'src/users/entities/user.entity';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { Affiliate } from './entities/affiliate.entity';
import { AffiliateCommission } from './entities/affiliate-commission.entity';
import { AffiliateStatus } from './entities/affiliate-status.enum';
import { AffiliateTier } from './entities/affiliate-tier.enum';
import { AffiliateCommissionStatus } from './entities/affiliate-commission-status.enum';
import { AffiliateCommissionType } from './entities/affiliate-commission-type.enum';
import { CommissionPaginationDto } from './dto/commission-pagination.dto';

export const ATTRIBUTION_WINDOW_DAYS = 60;
export const RECURRING_WINDOW_DAYS = 365;
export const APPROVAL_DAYS = 30;

export const COMMISSION_RATES: Record<
  AffiliateTier,
  { firstPurchase: number; recurring: number | null }
> = {
  [AffiliateTier.STANDARD]: { firstPurchase: 0.2, recurring: null },
  [AffiliateTier.AMBASSADOR]: { firstPurchase: 0.3, recurring: 0.2 },
  [AffiliateTier.PARTNER]: { firstPurchase: 0.3, recurring: 0.3 },
};

const ELIGIBLE_PLAN_TYPES = [UserPlanType.PLAN_AUTOR, UserPlanType.PLAN_360, UserPlanType.PLAN_DESCUBRIDOR];

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

@Injectable()
export class AffiliateCommissionsService {
  private readonly logger = new Logger(AffiliateCommissionsService.name);

  constructor(
    @InjectRepository(AffiliateCommission)
    private readonly commissionRepo: Repository<AffiliateCommission>,
    @InjectRepository(Affiliate)
    private readonly affiliateRepo: Repository<Affiliate>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Punto de entrada llamado por el listener del evento `payment.subscription.approved`.
   * Crea una comisión de afiliado si el usuario que compró fue referido, el afiliado
   * está activo, y la compra cae dentro de las ventanas de atribución/recurrencia.
   */
  async createCommissionForPurchase(payload: AppEventMap['payment.subscription.approved']) {
    if (!ELIGIBLE_PLAN_TYPES.includes(payload.planType)) return;

    const user = await this.userRepo.findOne({ where: { id: payload.userId } });
    if (!user?.referredByAffiliateId || !user.referredAt) return;

    const affiliate = await this.affiliateRepo.findOne({
      where: { id: user.referredByAffiliateId },
    });
    if (!affiliate || affiliate.status !== AffiliateStatus.APPROVED) return;

    const rates = COMMISSION_RATES[affiliate.tier];
    const now = payload.occurredAt ?? new Date();

    if (payload.isFirstPurchase) {
      if (now > addDays(user.referredAt, ATTRIBUTION_WINDOW_DAYS)) {
        this.logger.log(
          `[Affiliates] compra fuera de la ventana de atribución (userId=${user.id})`,
        );
        return;
      }
      await this.saveCommission({
        affiliate,
        userId: user.id,
        payload,
        type: AffiliateCommissionType.FIRST_PURCHASE,
        rate: rates.firstPurchase,
      });
      return;
    }

    if (rates.recurring === null) return; // el tier estándar no tiene bono de recurrencia

    const firstCommission = await this.commissionRepo.findOne({
      where: {
        affiliateId: affiliate.id,
        referredUserId: user.id,
        commissionType: AffiliateCommissionType.FIRST_PURCHASE,
      },
      order: { createdAt: 'ASC' },
    });
    if (!firstCommission) return;
    if (now > addDays(firstCommission.createdAt, RECURRING_WINDOW_DAYS)) {
      this.logger.log(
        `[Affiliates] renovación fuera de la ventana de recurrencia (userId=${user.id})`,
      );
      return;
    }

    await this.saveCommission({
      affiliate,
      userId: user.id,
      payload,
      type: AffiliateCommissionType.RECURRING,
      rate: rates.recurring,
    });
  }

  private async saveCommission(params: {
    affiliate: Affiliate;
    userId: string;
    payload: AppEventMap['payment.subscription.approved'];
    type: AffiliateCommissionType;
    rate: number;
  }) {
    const { affiliate, userId, payload, type, rate } = params;
    const commissionAmount = Math.round(payload.amount * rate * 100) / 100;
    const now = new Date();

    try {
      await this.commissionRepo.save({
        affiliateId: affiliate.id,
        referredUserId: userId,
        paymentId: payload.paymentId,
        commissionType: type,
        tier: affiliate.tier,
        commissionRate: rate,
        saleAmount: payload.amount,
        commissionAmount,
        status: AffiliateCommissionStatus.PENDING,
        planType: payload.planType,
        billingPeriod: payload.billingPeriod,
        isFirstPurchase: payload.isFirstPurchase,
        approvalDueAt: addDays(now, APPROVAL_DAYS),
      });
      this.logger.log(
        `[Affiliates] comisión ${type} creada para affiliateId=${affiliate.id} userId=${userId} monto=${commissionAmount}`,
      );
    } catch (err: any) {
      if (err?.code === '23505') {
        this.logger.warn(
          `[Affiliates] comisión duplicada ignorada para paymentId=${payload.paymentId}`,
        );
        return;
      }
      throw err;
    }
  }

  /** Aprueba automáticamente las comisiones pendientes cuyo plazo de 30 días ya venció. */
  async approveDueCommissions(): Promise<number> {
    const result = await this.commissionRepo.update(
      {
        status: AffiliateCommissionStatus.PENDING,
        approvalDueAt: LessThanOrEqual(new Date()),
      },
      { status: AffiliateCommissionStatus.APPROVED, approvedAt: new Date() },
    );
    return result.affected ?? 0;
  }

  async getKpisForAffiliate(affiliateId: string) {
    const commissions = await this.commissionRepo.find({ where: { affiliateId } });

    const sumByStatus = (status: AffiliateCommissionStatus) =>
      commissions
        .filter((c) => c.status === status)
        .reduce((sum, c) => sum + Number(c.commissionAmount), 0);

    const totalSalesAmount = commissions.reduce((sum, c) => sum + Number(c.saleAmount), 0);
    const convertedReferrals = new Set(
      commissions
        .filter((c) => c.commissionType === AffiliateCommissionType.FIRST_PURCHASE)
        .map((c) => c.referredUserId),
    ).size;

    return {
      convertedReferrals,
      totalSalesAmount,
      commissionPending: sumByStatus(AffiliateCommissionStatus.PENDING),
      commissionApproved: sumByStatus(AffiliateCommissionStatus.APPROVED),
      commissionPaid: sumByStatus(AffiliateCommissionStatus.PAID),
      commissionTotal:
        sumByStatus(AffiliateCommissionStatus.PENDING) +
        sumByStatus(AffiliateCommissionStatus.APPROVED) +
        sumByStatus(AffiliateCommissionStatus.PAID),
    };
  }

  async findRecentForAffiliate(affiliateId: string, take = 5) {
    return this.commissionRepo.find({
      where: { affiliateId },
      order: { createdAt: 'DESC' },
      take,
    });
  }

  async findForAffiliate(affiliateId: string, pagination: CommissionPaginationDto) {
    const { limit = 10, offset = 0, status } = pagination;
    const [data, total] = await this.commissionRepo.findAndCount({
      where: { affiliateId, ...(status ? { status } : {}) },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  async findAllForAdmin(pagination: CommissionPaginationDto) {
    const { limit = 10, offset = 0, status, affiliateId } = pagination;
    const [data, total] = await this.commissionRepo.findAndCount({
      where: {
        ...(status ? { status } : {}),
        ...(affiliateId ? { affiliateId } : {}),
      },
      relations: ['affiliate'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  async markPaid(id: string) {
    await this.commissionRepo.update(id, {
      status: AffiliateCommissionStatus.PAID,
      paidAt: new Date(),
    });
    return this.commissionRepo.findOne({ where: { id } });
  }

  async reject(id: string, reason: string) {
    await this.commissionRepo.update(id, {
      status: AffiliateCommissionStatus.REJECTED,
      rejectedAt: new Date(),
      rejectionReason: reason,
    });
    return this.commissionRepo.findOne({ where: { id } });
  }
}
