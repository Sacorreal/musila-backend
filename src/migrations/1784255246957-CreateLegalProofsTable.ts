import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabla polimórfica de evidencia legal (hash SHA-256 + metadata + timestamp
 * OpenTimestamps) para cualquier documento gestionado en la plataforma.
 * `entity_type`/`entity_id` no tienen FK física, mismo patrón que `audit_log`:
 * cada módulo llamante referencia su propio id sin acoplamiento en DB.
 */
export class CreateLegalProofsTable1784255246957 implements MigrationInterface {
  name = 'CreateLegalProofsTable1784255246957';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."legal_proofs_status_enum" AS ENUM('pending', 'confirmed', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "legal_proofs" (
        "id"                    uuid NOT NULL DEFAULT uuid_generate_v4(),
        "entity_type"           character varying(50) NOT NULL,
        "entity_id"             uuid NOT NULL,
        "file_name"             character varying NOT NULL,
        "mime_type"             character varying(150) NOT NULL,
        "file_size_bytes"       bigint NOT NULL,
        "sha256_hash"           character(64) NOT NULL,
        "metadata"              jsonb,
        "source_file_key"       character varying,
        "ots_key"                character varying,
        "status"                "public"."legal_proofs_status_enum" NOT NULL DEFAULT 'pending',
        "retry_count"           smallint NOT NULL DEFAULT 0,
        "error_message"         text,
        "requested_by_user_id"  uuid,
        "process_started_at"    timestamptz NOT NULL,
        "process_completed_at"  timestamptz,
        "created_at"            timestamptz NOT NULL DEFAULT now(),
        "updated_at"            timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_legal_proofs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_legal_proofs_entity" ON "legal_proofs" ("entity_type", "entity_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_legal_proofs_hash" ON "legal_proofs" ("sha256_hash")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_legal_proofs_status" ON "legal_proofs" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_legal_proofs_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_legal_proofs_hash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_legal_proofs_entity"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "legal_proofs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."legal_proofs_status_enum"`);
  }
}
