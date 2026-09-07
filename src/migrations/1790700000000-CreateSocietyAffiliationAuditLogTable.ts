import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bitácora de auditoría de afiliaciones (§13), append-only y sin FKs — mismo
 * criterio que `staff_audit_log`: debe sobrevivir a un hard-delete del actor,
 * autor o afiliación referenciados.
 */
export class CreateSocietyAffiliationAuditLogTable1790700000000 implements MigrationInterface {
  name = 'CreateSocietyAffiliationAuditLogTable1790700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "society_affiliation_audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event_type" varchar(60) NOT NULL,
        "actor_id" uuid NOT NULL,
        "author_id" uuid NOT NULL,
        "organization_id" uuid,
        "society_affiliation_id" uuid,
        "society_id" uuid,
        "rights_type" varchar,
        "before" jsonb,
        "after" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_society_affiliation_audit_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_saal_author_id_created_at" ON "society_affiliation_audit_logs" ("author_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_saal_society_affiliation_id" ON "society_affiliation_audit_logs" ("society_affiliation_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_saal_society_affiliation_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_saal_author_id_created_at"`);
    await queryRunner.query(`DROP TABLE "society_affiliation_audit_logs"`);
  }
}
