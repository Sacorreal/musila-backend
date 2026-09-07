import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EntitlementPeriod } from './entities/entitlement-period.enum';
import { SubjectType } from './entities/subject-type.enum';
import { Usage } from './entities/usage.entity';

export interface UsageSubject {
  type: SubjectType;
  id: string;
}

export interface ConsumeParams {
  subject: UsageSubject;
  entitlementKey: string;
  periodKey: string;
  amount?: number;
  /** null/undefined con unlimited=true: sin tope. */
  limit?: number | null;
  unlimited: boolean;
}

export interface ConsumeResult {
  allowed: boolean;
  consumed: number;
  remaining: number | null;
}

/**
 * Contadores de consumo de entitlements (§8). El incremento es una única
 * sentencia upsert condicional en Postgres: sin ventana de carrera entre el
 * chequeo del límite y el incremento, sin bloqueos pesimistas.
 */
@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(Usage)
    private readonly usageRepository: Repository<Usage>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Incremento atómico. Devuelve `allowed: false` si el consumo superaría el
   * límite (LIMIT_EXCEEDED); nunca bloquea cuando `unlimited` es true.
   */
  async consume(params: ConsumeParams): Promise<ConsumeResult> {
    const amount = params.amount ?? 1;

    if (params.unlimited || params.limit === null || params.limit === undefined) {
      const consumed = await this.upsertUnbounded(params, amount);
      return { allowed: true, consumed, remaining: null };
    }

    const limit = params.limit;

    if (amount > limit) {
      const current = await this.getConsumed(params.subject, params.entitlementKey, params.periodKey);
      return { allowed: false, consumed: current, remaining: Math.max(limit - current, 0) };
    }

    const rows: { consumed: number }[] = await this.dataSource.query(
      `
      INSERT INTO "usage" ("id", "subject_type", "subject_id", "entitlement_key", "period_key", "consumed", "updated_at")
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, now())
      ON CONFLICT ("subject_type", "subject_id", "entitlement_key", "period_key")
      DO UPDATE SET "consumed" = "usage"."consumed" + EXCLUDED."consumed", "updated_at" = now()
      WHERE "usage"."consumed" + EXCLUDED."consumed" <= $6
      RETURNING "consumed"
      `,
      [params.subject.type, params.subject.id, params.entitlementKey, params.periodKey, amount, limit],
    );

    if (rows.length === 0) {
      const current = await this.getConsumed(params.subject, params.entitlementKey, params.periodKey);
      return { allowed: false, consumed: current, remaining: Math.max(limit - current, 0) };
    }

    const consumed = Number(rows[0].consumed);
    return { allowed: true, consumed, remaining: Math.max(limit - consumed, 0) };
  }

  /** Devuelve consumo tras un fallo del handler (compensación del interceptor). */
  async refund(
    subject: UsageSubject,
    entitlementKey: string,
    periodKey: string,
    amount = 1,
  ): Promise<void> {
    await this.dataSource.query(
      `
      UPDATE "usage"
      SET "consumed" = GREATEST("consumed" - $5, 0), "updated_at" = now()
      WHERE "subject_type" = $1 AND "subject_id" = $2 AND "entitlement_key" = $3 AND "period_key" = $4
      `,
      [subject.type, subject.id, entitlementKey, periodKey, amount],
    );
  }

  async getConsumed(
    subject: UsageSubject,
    entitlementKey: string,
    periodKey: string,
  ): Promise<number> {
    const usage = await this.usageRepository.findOne({
      where: {
        subjectType: subject.type,
        subjectId: subject.id,
        entitlementKey,
        periodKey,
      },
    });
    return usage?.consumed ?? 0;
  }

  async findForSubject(subject: UsageSubject): Promise<Usage[]> {
    return this.usageRepository.find({
      where: { subjectType: subject.type, subjectId: subject.id },
      order: { entitlementKey: 'ASC', periodKey: 'DESC' },
    });
  }

  /** periodKey vigente según el período configurado del entitlement. */
  buildPeriodKey(period: EntitlementPeriod, reference: Date = new Date(), subscriptionInfo?: {
    subscriptionId: string;
    periodStart: Date;
  }): string {
    const year = reference.getUTCFullYear();
    const month = String(reference.getUTCMonth() + 1).padStart(2, '0');
    const day = String(reference.getUTCDate()).padStart(2, '0');

    switch (period) {
      case EntitlementPeriod.MONTH:
        return `${year}-${month}`;
      case EntitlementPeriod.YEAR:
        return `${year}`;
      case EntitlementPeriod.DAY:
        return `${year}-${month}-${day}`;
      case EntitlementPeriod.BILLING_PERIOD:
        if (!subscriptionInfo) return 'lifetime';
        return `sub:${subscriptionInfo.subscriptionId}:${subscriptionInfo.periodStart.toISOString()}`;
      case EntitlementPeriod.LIFETIME:
      case EntitlementPeriod.NONE:
      default:
        return 'lifetime';
    }
  }

  private async upsertUnbounded(params: ConsumeParams, amount: number): Promise<number> {
    const rows: { consumed: number }[] = await this.dataSource.query(
      `
      INSERT INTO "usage" ("id", "subject_type", "subject_id", "entitlement_key", "period_key", "consumed", "updated_at")
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, now())
      ON CONFLICT ("subject_type", "subject_id", "entitlement_key", "period_key")
      DO UPDATE SET "consumed" = "usage"."consumed" + EXCLUDED."consumed", "updated_at" = now()
      RETURNING "consumed"
      `,
      [params.subject.type, params.subject.id, params.entitlementKey, params.periodKey, amount],
    );
    return Number(rows[0].consumed);
  }
}
