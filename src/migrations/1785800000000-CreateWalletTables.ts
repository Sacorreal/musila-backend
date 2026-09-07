import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tablas del módulo Wallet: `wallet_earnings` (ledger append-only de créditos
 * por venta de licencias, propias o como coautor) y `wallet_withdrawals`
 * (solicitudes de retiro gestionadas manualmente por un administrador).
 * La unicidad (source_reference, beneficiary_user_id) en wallet_earnings
 * garantiza idempotencia si el evento de pago aprobado llega duplicado.
 */
export class CreateWalletTables1785800000000 implements MigrationInterface {
  name = 'CreateWalletTables1785800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."wallet_earning_role_enum" AS ENUM('own', 'coauthor')`);
    await queryRunner.query(`CREATE TYPE "public"."wallet_distribution_source_enum" AS ENUM('contract_advance_distribution', 'split', 'equal_fallback')`);
    await queryRunner.query(`
      CREATE TABLE "wallet_earnings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "beneficiary_user_id" uuid NOT NULL,
        "requested_track_id" uuid NOT NULL,
        "license_contract_id" uuid,
        "license_collection_id" uuid,
        "track_title" character varying NOT NULL,
        "role" "public"."wallet_earning_role_enum" NOT NULL,
        "distribution_source" "public"."wallet_distribution_source_enum" NOT NULL,
        "gross_amount" numeric(12,2) NOT NULL,
        "percentage" numeric(5,2) NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'COP',
        "source_reference" character varying NOT NULL,
        "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_wallet_earning_source_beneficiary" UNIQUE ("source_reference", "beneficiary_user_id"),
        CONSTRAINT "PK_wallet_earnings" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_wallet_earnings_beneficiary" ON "wallet_earnings" ("beneficiary_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_wallet_earnings_requested_track" ON "wallet_earnings" ("requested_track_id")`);
    await queryRunner.query(`ALTER TABLE "wallet_earnings" ADD CONSTRAINT "FK_wallet_earnings_beneficiary" FOREIGN KEY ("beneficiary_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "wallet_earnings" ADD CONSTRAINT "FK_wallet_earnings_requested_track" FOREIGN KEY ("requested_track_id") REFERENCES "requested_track"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "wallet_earnings" ADD CONSTRAINT "FK_wallet_earnings_license_contract" FOREIGN KEY ("license_contract_id") REFERENCES "license_contract"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "wallet_earnings" ADD CONSTRAINT "FK_wallet_earnings_license_collection" FOREIGN KEY ("license_collection_id") REFERENCES "license_collections"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

    await queryRunner.query(`CREATE TYPE "public"."wallet_withdrawal_status_enum" AS ENUM('pending', 'in_process', 'paid', 'rejected')`);
    await queryRunner.query(`
      CREATE TABLE "wallet_withdrawals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'COP',
        "status" "public"."wallet_withdrawal_status_enum" NOT NULL DEFAULT 'pending',
        "bank_account_snapshot" jsonb NOT NULL,
        "processed_by_admin_id" uuid,
        "rejection_reason" text,
        "in_process_at" TIMESTAMP WITH TIME ZONE,
        "paid_at" TIMESTAMP WITH TIME ZONE,
        "rejected_at" TIMESTAMP WITH TIME ZONE,
        "notification_attempts" integer NOT NULL DEFAULT 0,
        "notification_last_error" text,
        "notified_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallet_withdrawals" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_wallet_withdrawal_user_status" ON "wallet_withdrawals" ("user_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_wallet_withdrawals_status" ON "wallet_withdrawals" ("status")`);
    await queryRunner.query(`ALTER TABLE "wallet_withdrawals" ADD CONSTRAINT "FK_wallet_withdrawals_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "wallet_withdrawals" ADD CONSTRAINT "FK_wallet_withdrawals_processed_by_admin" FOREIGN KEY ("processed_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wallet_withdrawals" DROP CONSTRAINT "FK_wallet_withdrawals_processed_by_admin"`);
    await queryRunner.query(`ALTER TABLE "wallet_withdrawals" DROP CONSTRAINT "FK_wallet_withdrawals_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_wallet_withdrawals_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_wallet_withdrawal_user_status"`);
    await queryRunner.query(`DROP TABLE "wallet_withdrawals"`);
    await queryRunner.query(`DROP TYPE "public"."wallet_withdrawal_status_enum"`);

    await queryRunner.query(`ALTER TABLE "wallet_earnings" DROP CONSTRAINT "FK_wallet_earnings_license_collection"`);
    await queryRunner.query(`ALTER TABLE "wallet_earnings" DROP CONSTRAINT "FK_wallet_earnings_license_contract"`);
    await queryRunner.query(`ALTER TABLE "wallet_earnings" DROP CONSTRAINT "FK_wallet_earnings_requested_track"`);
    await queryRunner.query(`ALTER TABLE "wallet_earnings" DROP CONSTRAINT "FK_wallet_earnings_beneficiary"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_wallet_earnings_requested_track"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_wallet_earnings_beneficiary"`);
    await queryRunner.query(`DROP TABLE "wallet_earnings"`);
    await queryRunner.query(`DROP TYPE "public"."wallet_distribution_source_enum"`);
    await queryRunner.query(`DROP TYPE "public"."wallet_earning_role_enum"`);
  }
}
