import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Precio configurable por el admin de Musila para un `Plan` (§Registro Legal
 * B2B, paso 3). Append-only versionado, mismo criterio que
 * `transaction_fee_config`: la fila vigente es la única con
 * `is_active = true AND effective_until IS NULL`.
 */
export class CreatePlanPricesTable1791900000000 implements MigrationInterface {
  name = 'CreatePlanPricesTable1791900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "plan_prices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "plan_id" uuid NOT NULL,
        "currency" varchar(10) NOT NULL,
        "amount_in_cents" integer NOT NULL,
        "billing_period" varchar(20) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "effective_from" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "effective_until" TIMESTAMP WITH TIME ZONE,
        "created_by_user_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plan_prices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_plan_prices_plan_id" FOREIGN KEY ("plan_id")
          REFERENCES "plans" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_plan_prices_plan_currency_period_active" ON "plan_prices" ("plan_id", "currency", "billing_period", "is_active")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_plan_prices_plan_currency_period_active"`);
    await queryRunner.query(`DROP TABLE "plan_prices"`);
  }
}
