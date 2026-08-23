import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bitácora de auditoría de la relación editora-autor (Feature 8), append-only
 * y sin FKs — mismo criterio que `society_affiliation_audit_logs`: debe
 * sobrevivir a un hard-delete del actor, autor u organización referenciados.
 */
export class CreatePublisherRelationshipAuditLogTable1791600000000 implements MigrationInterface {
  name = 'CreatePublisherRelationshipAuditLogTable1791600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "publisher_relationship_audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event_type" varchar(60) NOT NULL,
        "actor_id" uuid NOT NULL,
        "author_id" uuid NOT NULL,
        "organization_id" uuid,
        "publisher_share_id" uuid,
        "before" jsonb,
        "after" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_publisher_relationship_audit_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_pral_author_id_created_at" ON "publisher_relationship_audit_logs" ("author_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pral_publisher_share_id" ON "publisher_relationship_audit_logs" ("publisher_share_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_pral_publisher_share_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_pral_author_id_created_at"`);
    await queryRunner.query(`DROP TABLE "publisher_relationship_audit_logs"`);
  }
}
