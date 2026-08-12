import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Comisión por anticipo de licencia de publishers + wallet a nivel organización:
 *
 * - `publisher_commission_policies`: toggle "activar comisión" por organización.
 * - `publisher_roster_commissions`: porcentaje por miembro del roster.
 * - `organizations.bank_account`: cuenta bancaria destino de los retiros de la org.
 * - `requested_track.publisher_commission_snapshot`/`_frozen_at`: snapshot inmutable
 *   de la tarifa por vendedor congelado al iniciar el pago (Opción A).
 * - `wallet_earnings`/`wallet_withdrawals`: beneficiario polimórfico (usuario u
 *   organización). Se reemplaza la unicidad simple por un índice de expresión con
 *   COALESCE para preservar la idempotencia con beneficiario nullable.
 */
export class CreatePublisherCommissionAndOrgWallet1789700000000 implements MigrationInterface {
  name = 'CreatePublisherCommissionAndOrgWallet1789700000000';

  private readonly ZERO_UUID = '00000000-0000-0000-0000-000000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Configuración de comisión de publisher ──────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "publisher_commission_policies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "commission_enabled" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_publisher_commission_policy_org" UNIQUE ("organization_id"),
        CONSTRAINT "PK_publisher_commission_policies" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`ALTER TABLE "publisher_commission_policies" ADD CONSTRAINT "FK_publisher_commission_policy_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`
      CREATE TABLE "publisher_roster_commissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "percentage" numeric(5,2) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_publisher_roster_commission_org_user" UNIQUE ("organization_id", "user_id"),
        CONSTRAINT "PK_publisher_roster_commissions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_publisher_roster_commission_org" ON "publisher_roster_commissions" ("organization_id")`);
    await queryRunner.query(`ALTER TABLE "publisher_roster_commissions" ADD CONSTRAINT "FK_publisher_roster_commission_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "publisher_roster_commissions" ADD CONSTRAINT "FK_publisher_roster_commission_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    // ── Cuenta bancaria de la organización ──────────────────────────────────
    await queryRunner.query(`ALTER TABLE "organizations" ADD "bank_account" jsonb`);

    // ── Snapshot de comisión de publisher en la solicitud ───────────────────
    await queryRunner.query(`ALTER TABLE "requested_track" ADD "publisher_commission_snapshot" jsonb`);
    await queryRunner.query(`ALTER TABLE "requested_track" ADD "publisher_commission_frozen_at" TIMESTAMP WITH TIME ZONE`);

    // ── Nuevos valores de enum ──────────────────────────────────────────────
    await queryRunner.query(`ALTER TYPE "public"."wallet_earning_role_enum" ADD VALUE IF NOT EXISTS 'publisher_commission'`);
    await queryRunner.query(`ALTER TYPE "public"."wallet_distribution_source_enum" ADD VALUE IF NOT EXISTS 'publisher_commission'`);

    // ── wallet_earnings: beneficiario polimórfico (usuario u organización) ───
    await queryRunner.query(`ALTER TABLE "wallet_earnings" DROP CONSTRAINT "UQ_wallet_earning_source_beneficiary"`);
    await queryRunner.query(`ALTER TABLE "wallet_earnings" ALTER COLUMN "beneficiary_user_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "wallet_earnings" ADD "beneficiary_organization_id" uuid`);
    await queryRunner.query(`ALTER TABLE "wallet_earnings" ADD CONSTRAINT "FK_wallet_earnings_beneficiary_org" FOREIGN KEY ("beneficiary_organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`CREATE INDEX "IDX_wallet_earnings_beneficiary_org" ON "wallet_earnings" ("beneficiary_organization_id")`);
    await queryRunner.query(`ALTER TABLE "wallet_earnings" ADD CONSTRAINT "CHK_wallet_earnings_single_beneficiary" CHECK (num_nonnulls("beneficiary_user_id", "beneficiary_organization_id") = 1)`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_wallet_earning_source_beneficiary_expr" ON "wallet_earnings" ("source_reference", COALESCE("beneficiary_user_id", '${this.ZERO_UUID}'), COALESCE("beneficiary_organization_id", '${this.ZERO_UUID}'))`);

    // ── wallet_withdrawals: beneficiario polimórfico ────────────────────────
    await queryRunner.query(`ALTER TABLE "wallet_withdrawals" ALTER COLUMN "user_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "wallet_withdrawals" ADD "beneficiary_organization_id" uuid`);
    await queryRunner.query(`ALTER TABLE "wallet_withdrawals" ADD CONSTRAINT "FK_wallet_withdrawals_beneficiary_org" FOREIGN KEY ("beneficiary_organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`CREATE INDEX "IDX_wallet_withdrawals_beneficiary_org" ON "wallet_withdrawals" ("beneficiary_organization_id")`);
    await queryRunner.query(`ALTER TABLE "wallet_withdrawals" ADD CONSTRAINT "CHK_wallet_withdrawals_single_beneficiary" CHECK (num_nonnulls("user_id", "beneficiary_organization_id") = 1)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── wallet_withdrawals ──────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "wallet_withdrawals" DROP CONSTRAINT "CHK_wallet_withdrawals_single_beneficiary"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_wallet_withdrawals_beneficiary_org"`);
    await queryRunner.query(`ALTER TABLE "wallet_withdrawals" DROP CONSTRAINT "FK_wallet_withdrawals_beneficiary_org"`);
    await queryRunner.query(`ALTER TABLE "wallet_withdrawals" DROP COLUMN "beneficiary_organization_id"`);
    await queryRunner.query(`DELETE FROM "wallet_withdrawals" WHERE "user_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "wallet_withdrawals" ALTER COLUMN "user_id" SET NOT NULL`);

    // ── wallet_earnings ─────────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX "public"."UQ_wallet_earning_source_beneficiary_expr"`);
    await queryRunner.query(`ALTER TABLE "wallet_earnings" DROP CONSTRAINT "CHK_wallet_earnings_single_beneficiary"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_wallet_earnings_beneficiary_org"`);
    await queryRunner.query(`ALTER TABLE "wallet_earnings" DROP CONSTRAINT "FK_wallet_earnings_beneficiary_org"`);
    await queryRunner.query(`DELETE FROM "wallet_earnings" WHERE "beneficiary_user_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "wallet_earnings" DROP COLUMN "beneficiary_organization_id"`);
    await queryRunner.query(`ALTER TABLE "wallet_earnings" ALTER COLUMN "beneficiary_user_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "wallet_earnings" ADD CONSTRAINT "UQ_wallet_earning_source_beneficiary" UNIQUE ("source_reference", "beneficiary_user_id")`);

    // ── Enums: se recrean sin el valor 'publisher_commission' ───────────────
    await queryRunner.query(`ALTER TYPE "public"."wallet_distribution_source_enum" RENAME TO "wallet_distribution_source_enum_old"`);
    await queryRunner.query(`CREATE TYPE "public"."wallet_distribution_source_enum" AS ENUM('contract_advance_distribution', 'split', 'equal_fallback')`);
    await queryRunner.query(`ALTER TABLE "wallet_earnings" ALTER COLUMN "distribution_source" TYPE "public"."wallet_distribution_source_enum" USING "distribution_source"::text::"public"."wallet_distribution_source_enum"`);
    await queryRunner.query(`DROP TYPE "public"."wallet_distribution_source_enum_old"`);

    await queryRunner.query(`ALTER TYPE "public"."wallet_earning_role_enum" RENAME TO "wallet_earning_role_enum_old"`);
    await queryRunner.query(`CREATE TYPE "public"."wallet_earning_role_enum" AS ENUM('own', 'coauthor')`);
    await queryRunner.query(`ALTER TABLE "wallet_earnings" ALTER COLUMN "role" TYPE "public"."wallet_earning_role_enum" USING "role"::text::"public"."wallet_earning_role_enum"`);
    await queryRunner.query(`DROP TYPE "public"."wallet_earning_role_enum_old"`);

    // ── Columnas y tablas de la feature ─────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "requested_track" DROP COLUMN "publisher_commission_frozen_at"`);
    await queryRunner.query(`ALTER TABLE "requested_track" DROP COLUMN "publisher_commission_snapshot"`);
    await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN "bank_account"`);

    await queryRunner.query(`ALTER TABLE "publisher_roster_commissions" DROP CONSTRAINT "FK_publisher_roster_commission_user"`);
    await queryRunner.query(`ALTER TABLE "publisher_roster_commissions" DROP CONSTRAINT "FK_publisher_roster_commission_org"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_publisher_roster_commission_org"`);
    await queryRunner.query(`DROP TABLE "publisher_roster_commissions"`);

    await queryRunner.query(`ALTER TABLE "publisher_commission_policies" DROP CONSTRAINT "FK_publisher_commission_policy_org"`);
    await queryRunner.query(`DROP TABLE "publisher_commission_policies"`);
  }
}
