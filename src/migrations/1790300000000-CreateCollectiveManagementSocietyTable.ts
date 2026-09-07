import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Catálogo maestro controlado de sociedades de gestión colectiva (CMO/PRO),
 * §3 y §5 del requerimiento `musila_cmo_society_affiliation_metadata_requirement.md`.
 * Nunca se elimina en duro: "retirar" una sociedad es marcarla `DEPRECATED`
 * (§15), por eso el índice único de acrónimo+país excluye las depreciadas.
 */
export class CreateCollectiveManagementSocietyTable1790300000000 implements MigrationInterface {
  name = 'CreateCollectiveManagementSocietyTable1790300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."collective_management_society_organization_type_enum" AS ENUM('CMO', 'PRO', 'COLLECTING_SOCIETY', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."collective_management_society_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'DEPRECATED')`,
    );

    await queryRunner.query(`
      CREATE TABLE "collective_management_societies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "official_name" varchar NOT NULL,
        "acronym" varchar NOT NULL,
        "country" varchar NOT NULL,
        "iso_country_code" varchar(2) NOT NULL,
        "cisac_society_id" varchar,
        "organization_type" "public"."collective_management_society_organization_type_enum" NOT NULL DEFAULT 'CMO',
        "status" "public"."collective_management_society_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_collective_management_societies" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_cms_iso_country_code" ON "collective_management_societies" ("iso_country_code")`);
    await queryRunner.query(`CREATE INDEX "IDX_cms_status" ON "collective_management_societies" ("status")`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_cms_acronym_iso_country_code" ON "collective_management_societies" ("acronym", "iso_country_code")
      WHERE "status" <> 'DEPRECATED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_cms_acronym_iso_country_code"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cms_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cms_iso_country_code"`);
    await queryRunner.query(`DROP TABLE "collective_management_societies"`);
    await queryRunner.query(`DROP TYPE "public"."collective_management_society_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."collective_management_society_organization_type_enum"`);
  }
}
