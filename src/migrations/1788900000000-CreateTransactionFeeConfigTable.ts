import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Configuración versionada de la comisión transaccional por (plan, tipo de
 * organización) (§5/§21). Es append-only: al cambiar una tarifa se cierra la
 * fila vigente (`effective_until`, `is_active = false`) y se inserta otra. El
 * índice único parcial garantiza una única fila vigente por combinación.
 */
export class CreateTransactionFeeConfigTable1788900000000 implements MigrationInterface {
  name = 'CreateTransactionFeeConfigTable1788900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transaction_fee_config" (
        "id"                 uuid NOT NULL DEFAULT uuid_generate_v4(),
        "plan_id"            uuid NOT NULL,
        "entitlement_id"     uuid NOT NULL,
        "organization_type"  character varying(30) NOT NULL,
        "rate"               numeric(5,2) NOT NULL,
        "currency"           character varying(3) NOT NULL DEFAULT 'COP',
        "is_active"          boolean NOT NULL DEFAULT true,
        "effective_from"     timestamptz NOT NULL DEFAULT now(),
        "effective_until"    timestamptz,
        "created_by_user_id" uuid,
        "created_by_name"    character varying(150),
        "created_at"         timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transaction_fee_config" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transaction_fee_config_plan" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transaction_fee_config_entitlement" FOREIGN KEY ("entitlement_id") REFERENCES "entitlements"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_transaction_fee_config_plan_type_active" ON "transaction_fee_config" ("plan_id", "organization_type", "is_active")`,
    );

    // Una única tarifa vigente por (plan, tipo de organización).
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_transaction_fee_config_current" ON "transaction_fee_config" ("plan_id", "organization_type") WHERE "is_active" = true AND "effective_until" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_transaction_fee_config_current"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_transaction_fee_config_plan_type_active"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transaction_fee_config"`);
  }
}
