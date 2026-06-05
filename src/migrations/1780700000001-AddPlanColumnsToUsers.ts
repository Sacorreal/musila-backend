import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlanColumnsToUsers1780700000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Asegura que el tipo enum exista antes de usarlo
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."users_plan_enum" AS ENUM('free','pro');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan" "public"."users_plan_enum" NOT NULL DEFAULT 'free'`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan_expires_at" timestamptz`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fiscal_name" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tax_id" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fiscal_address" character varying`);

    // Columnas que también pueden faltar en bases de datos creadas antes de las migraciones baseline
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "second_name" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_second_name" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_key" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_token" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_token_expires" timestamp`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "reset_token_expires"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "reset_token"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "avatar_key"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "last_second_name"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "second_name"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "fiscal_address"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "tax_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "fiscal_name"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "plan_expires_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "plan"`);
  }
}
