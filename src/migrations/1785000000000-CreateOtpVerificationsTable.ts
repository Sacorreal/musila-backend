import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabla polimórfica de verificaciones OTP (código de un solo uso) previas a
 * acciones sensibles (aprobar solicitud, firmar/pagar licencia). `entity_type`/
 * `entity_id` no tienen FK física, mismo patrón que `legal_proofs`/`audit_log`.
 */
export class CreateOtpVerificationsTable1785000000000 implements MigrationInterface {
  name = 'CreateOtpVerificationsTable1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."otp_verifications_channel_enum" AS ENUM('email', 'sms', 'push'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "otp_verifications" (
        "id"           uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"      uuid NOT NULL,
        "purpose"      character varying(50) NOT NULL,
        "entity_type"  character varying(50) NOT NULL,
        "entity_id"    uuid NOT NULL,
        "channel"      "public"."otp_verifications_channel_enum" NOT NULL,
        "code_hash"    character varying(64) NOT NULL,
        "attempts"     smallint NOT NULL DEFAULT 0,
        "verified_at"  timestamptz,
        "consumed_at"  timestamptz,
        "expires_at"   timestamptz NOT NULL,
        "created_at"   timestamptz NOT NULL DEFAULT now(),
        "updated_at"   timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_otp_verifications" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_otp_verifications_lookup" ON "otp_verifications" ("user_id", "purpose", "entity_type", "entity_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_otp_verifications_expires" ON "otp_verifications" ("expires_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_otp_verifications_expires"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_otp_verifications_lookup"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "otp_verifications"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."otp_verifications_channel_enum"`);
  }
}
