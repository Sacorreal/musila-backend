import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Snapshot inmutable de la comisión B2B congelada en el Deal (§13). Los montos
 * usan NUMERIC, nunca float (§12). Estas columnas conservan la tarifa aplicada
 * al formalizar la operación, de modo que un cambio posterior de plan o de
 * configuración en Admin no altera los Deals existentes (§21).
 */
export class AddCommissionSnapshotToRequestedTrack1789000000000 implements MigrationInterface {
  name = 'AddCommissionSnapshotToRequestedTrack1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "requested_track"
        ADD COLUMN IF NOT EXISTS "buyer_organization_id"  uuid,
        ADD COLUMN IF NOT EXISTS "buyer_plan_id"          uuid,
        ADD COLUMN IF NOT EXISTS "buyer_subscription_id"  uuid,
        ADD COLUMN IF NOT EXISTS "commission_rate"        numeric(5,2),
        ADD COLUMN IF NOT EXISTS "commission_amount"      numeric(18,2),
        ADD COLUMN IF NOT EXISTS "commission_currency"    character varying(3),
        ADD COLUMN IF NOT EXISTS "commission_resolved_at" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "requested_track"
        DROP COLUMN IF EXISTS "commission_resolved_at",
        DROP COLUMN IF EXISTS "commission_currency",
        DROP COLUMN IF EXISTS "commission_amount",
        DROP COLUMN IF EXISTS "commission_rate",
        DROP COLUMN IF EXISTS "buyer_subscription_id",
        DROP COLUMN IF EXISTS "buyer_plan_id",
        DROP COLUMN IF EXISTS "buyer_organization_id"
    `);
  }
}
