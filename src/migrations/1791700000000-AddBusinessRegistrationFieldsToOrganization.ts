import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Campos de onboarding comercial B2B (§Registro Legal B2B): estado de
 * ciclo de vida (`status`) y datos legales de la empresa recolectados por
 * `createBusinessForm`. Las organizaciones ya existentes (creadas por el
 * flujo admin manual `POST /admin/organizations`) se backfillean a
 * `VERIFICADA` para no romper producción — solo las nuevas nacen en
 * `EN_TRAMITE`.
 */
export class AddBusinessRegistrationFieldsToOrganization1791700000000 implements MigrationInterface {
  name = 'AddBusinessRegistrationFieldsToOrganization1791700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organizations"
        ADD COLUMN "status" varchar(20) NOT NULL DEFAULT 'VERIFICADA',
        ADD COLUMN "legal_country" varchar(2),
        ADD COLUMN "document_type" varchar(30),
        ADD COLUMN "document_number" varchar(50),
        ADD COLUMN "phone_country_code" varchar(8),
        ADD COLUMN "phone_number" varchar(20),
        ADD COLUMN "registered_by_user_id" uuid,
        ADD COLUMN "plan_id" uuid,
        ADD COLUMN "rejection_reason" varchar(500),
        ADD COLUMN "verified_at" TIMESTAMP WITH TIME ZONE
    `);

    // Backfill explícito (coincide con el DEFAULT, documentado por claridad de intención).
    await queryRunner.query(`UPDATE "organizations" SET "status" = 'VERIFICADA'`);

    await queryRunner.query(
      `CREATE INDEX "IDX_organizations_status" ON "organizations" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_organizations_status"`);
    await queryRunner.query(`
      ALTER TABLE "organizations"
        DROP COLUMN "status",
        DROP COLUMN "legal_country",
        DROP COLUMN "document_type",
        DROP COLUMN "document_number",
        DROP COLUMN "phone_country_code",
        DROP COLUMN "phone_number",
        DROP COLUMN "registered_by_user_id",
        DROP COLUMN "plan_id",
        DROP COLUMN "rejection_reason",
        DROP COLUMN "verified_at"
    `);
  }
}
