import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bitácora de auditoría de acciones de staff. Sin FK física en `actor_user_id`
 * (mismo patrón que `audit_log`/`otp_verifications`): el registro debe
 * sobrevivir a un hard-delete del usuario, ya que la retención mínima de 90
 * días es un requisito de seguridad/compliance. `actor_name`/`actor_role_name`
 * quedan desnormalizados como snapshot al momento del evento. Tabla
 * append-only, sin purga automática (90 días es un piso, no un TTL).
 */
export class CreateStaffAuditLogTable1786800000000
  implements MigrationInterface
{
  name = 'CreateStaffAuditLogTable1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."staff_audit_log_outcome_enum" AS ENUM('success', 'failure'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_audit_log" (
        "id"              uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actor_user_id"   uuid NOT NULL,
        "actor_name"      character varying(150) NOT NULL,
        "actor_role_name" character varying(100),
        "module"          character varying(50) NOT NULL,
        "action"          character varying(100) NOT NULL,
        "http_method"     character varying(10),
        "route"           character varying(255),
        "entity_type"     character varying(50),
        "entity_id"       character varying(100),
        "status_code"     smallint,
        "outcome"         "public"."staff_audit_log_outcome_enum" NOT NULL DEFAULT 'success',
        "ip_address"      character varying(64),
        "user_agent"      character varying(255),
        "metadata"        jsonb,
        "duration_ms"     integer,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_staff_audit_log" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_staff_audit_log_created_at" ON "staff_audit_log" ("created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_staff_audit_log_actor_created" ON "staff_audit_log" ("actor_user_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_staff_audit_log_module_action" ON "staff_audit_log" ("module", "action")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_staff_audit_log_module_action"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_staff_audit_log_actor_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_staff_audit_log_created_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_audit_log"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."staff_audit_log_outcome_enum"`);
  }
}
