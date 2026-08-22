import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Relación autor ↔ sociedad de gestión colectiva (§4, §5). El índice único
 * parcial `UQ_society_affiliation_active_combo` es el mecanismo real
 * anti-duplicado (§14 "rechazar duplicado según constraint"): cubre solo las
 * filas PENDING/ACTIVE/SUSPENDED, así que finalizar una afiliación (ENDED) y
 * volver a crear la misma combinación después es válido — el histórico nunca
 * se borra (§9, §11).
 */
export class CreateSocietyAffiliationTable1790500000000 implements MigrationInterface {
  name = 'CreateSocietyAffiliationTable1790500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."society_affiliation_rights_type_enum" AS ENUM('PR', 'MR', 'SR')`);
    await queryRunner.query(
      `CREATE TYPE "public"."society_affiliation_status_enum" AS ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'ENDED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."society_affiliation_verification_status_enum" AS ENUM('UNVERIFIED', 'DECLARED', 'DOCUMENT_SUPPORTED', 'VERIFIED', 'REJECTED')`,
    );
    await queryRunner.query(`CREATE TYPE "public"."society_affiliation_source_enum" AS ENUM('SELF_DECLARED', 'STAFF_IMPORTED')`);

    await queryRunner.query(`
      CREATE TABLE "society_affiliations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "author_id" uuid NOT NULL,
        "collective_management_society_id" uuid NOT NULL,
        "rights_type" "public"."society_affiliation_rights_type_enum" NOT NULL,
        "territory" varchar(2) NOT NULL,
        "membership_number" varchar,
        "ipi_name_number" varchar,
        "ipi_base_number" varchar,
        "valid_from" date,
        "valid_to" date,
        "status" "public"."society_affiliation_status_enum" NOT NULL DEFAULT 'PENDING',
        "verification_status" "public"."society_affiliation_verification_status_enum" NOT NULL DEFAULT 'UNVERIFIED',
        "source" "public"."society_affiliation_source_enum" NOT NULL DEFAULT 'SELF_DECLARED',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_society_affiliations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "society_affiliations" ADD CONSTRAINT "FK_society_affiliation_author" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "society_affiliations" ADD CONSTRAINT "FK_society_affiliation_society" FOREIGN KEY ("collective_management_society_id") REFERENCES "collective_management_societies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`CREATE INDEX "IDX_society_affiliation_author_id" ON "society_affiliations" ("author_id")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_society_affiliation_society_id" ON "society_affiliations" ("collective_management_society_id")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_society_affiliation_rights_type" ON "society_affiliations" ("rights_type")`);
    await queryRunner.query(`CREATE INDEX "IDX_society_affiliation_territory" ON "society_affiliations" ("territory")`);
    await queryRunner.query(`CREATE INDEX "IDX_society_affiliation_ipi_name_number" ON "society_affiliations" ("ipi_name_number")`);
    await queryRunner.query(`CREATE INDEX "IDX_society_affiliation_status" ON "society_affiliations" ("status")`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_society_affiliation_active_combo" ON "society_affiliations"
        ("author_id", "collective_management_society_id", "rights_type", "territory")
      WHERE "status" IN ('PENDING', 'ACTIVE', 'SUSPENDED')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_society_affiliation_active_combo"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_society_affiliation_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_society_affiliation_ipi_name_number"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_society_affiliation_territory"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_society_affiliation_rights_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_society_affiliation_society_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_society_affiliation_author_id"`);
    await queryRunner.query(`ALTER TABLE "society_affiliations" DROP CONSTRAINT "FK_society_affiliation_society"`);
    await queryRunner.query(`ALTER TABLE "society_affiliations" DROP CONSTRAINT "FK_society_affiliation_author"`);
    await queryRunner.query(`DROP TABLE "society_affiliations"`);
    await queryRunner.query(`DROP TYPE "public"."society_affiliation_source_enum"`);
    await queryRunner.query(`DROP TYPE "public"."society_affiliation_verification_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."society_affiliation_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."society_affiliation_rights_type_enum"`);
  }
}
