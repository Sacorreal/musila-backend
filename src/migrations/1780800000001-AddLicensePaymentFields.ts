import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLicensePaymentFields1780800000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."license_payment_status_enum" AS ENUM('none', 'pending', 'approved', 'failed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`ALTER TABLE "requested_track" ADD COLUMN IF NOT EXISTS "license_price" NUMERIC(12,2)`);
    await queryRunner.query(`ALTER TABLE "requested_track" ADD COLUMN IF NOT EXISTS "license_price_set_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "requested_track" ADD COLUMN IF NOT EXISTS "license_payment_reference" VARCHAR`);
    await queryRunner.query(`ALTER TABLE "requested_track" ADD COLUMN IF NOT EXISTS "license_payment_status" "public"."license_payment_status_enum" NOT NULL DEFAULT 'none'`);

    // ALTER TYPE ... ADD VALUE no puede ejecutarse dentro de una transacción
    await queryRunner.query(`ALTER TYPE "public"."payments_payment_type_enum" ADD VALUE IF NOT EXISTS 'license'`);

    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "requested_track_id" UUID`);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_requested_track"
          FOREIGN KEY ("requested_track_id") REFERENCES "requested_track"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "FK_payments_requested_track"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "requested_track_id"`);

    await queryRunner.query(`ALTER TABLE "requested_track" DROP COLUMN IF EXISTS "license_payment_status"`);
    await queryRunner.query(`ALTER TABLE "requested_track" DROP COLUMN IF EXISTS "license_payment_reference"`);
    await queryRunner.query(`ALTER TABLE "requested_track" DROP COLUMN IF EXISTS "license_price_set_at"`);
    await queryRunner.query(`ALTER TABLE "requested_track" DROP COLUMN IF EXISTS "license_price"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "public"."license_payment_status_enum"`);
  }
}
