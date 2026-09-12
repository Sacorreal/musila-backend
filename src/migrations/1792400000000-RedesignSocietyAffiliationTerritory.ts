import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reemplaza `territory` (varchar(2), un solo país) por un modelo que soporta
 * los casos reales de afiliación a sociedades de gestión colectiva: un país
 * o varios países específicos, todo el mundo, o todo el mundo excepto ciertos
 * países (ej. SAYCO mundial excepto EE.UU., y otra sociedad solo para EE.UU.
 * — ambos deben poder coexistir sin solaparse). El índice único parcial que
 * dependía de `territory` como escalar comparable por igualdad deja de ser
 * suficiente: se recrea cubriendo solo el duplicado exacto (mismo modo +
 * mismo conjunto de países); el solapamiento semántico entre territorios se
 * valida en `SocietyAffiliationService.assertNoActiveOverlap`. El snapshot
 * histórico `work_society_affiliation_snapshots` recibe el mismo cambio de
 * forma para conservar fidelidad con la afiliación origen.
 */
export class RedesignSocietyAffiliationTerritory1792400000000 implements MigrationInterface {
  name = 'RedesignSocietyAffiliationTerritory1792400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."society_affiliation_territory_mode_enum" AS ENUM('SPECIFIC_COUNTRIES', 'WORLDWIDE', 'WORLDWIDE_EXCEPT')`,
    );

    // --- society_affiliations ---
    await queryRunner.query(
      `ALTER TABLE "society_affiliations" ADD COLUMN "territory_mode" "public"."society_affiliation_territory_mode_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "society_affiliations" ADD COLUMN "territory_countries" jsonb NOT NULL DEFAULT '[]'`);

    // Backfill: cada fila existente era un solo país -> SPECIFIC_COUNTRIES con ese país.
    await queryRunner.query(`
      UPDATE "society_affiliations"
      SET "territory_mode" = 'SPECIFIC_COUNTRIES', "territory_countries" = jsonb_build_array("territory")
    `);
    await queryRunner.query(`ALTER TABLE "society_affiliations" ALTER COLUMN "territory_mode" SET NOT NULL`);

    await queryRunner.query(`DROP INDEX "public"."UQ_society_affiliation_active_combo"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_society_affiliation_territory"`);
    await queryRunner.query(`ALTER TABLE "society_affiliations" DROP COLUMN "territory"`);

    await queryRunner.query(`CREATE INDEX "IDX_society_affiliation_territory_mode" ON "society_affiliations" ("territory_mode")`);

    // Solo bloquea el duplicado EXACTO (mismo modo + mismo conjunto de países);
    // el solapamiento semántico se valida en el service.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_society_affiliation_active_combo" ON "society_affiliations"
        ("author_id", "collective_management_society_id", "rights_type", "territory_mode", "territory_countries")
      WHERE "status" IN ('PENDING', 'ACTIVE', 'SUSPENDED')
    `);

    // --- work_society_affiliation_snapshots: mismo cambio de forma ---
    await queryRunner.query(
      `ALTER TABLE "work_society_affiliation_snapshots" ADD COLUMN "territory_mode" "public"."society_affiliation_territory_mode_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_society_affiliation_snapshots" ADD COLUMN "territory_countries" jsonb NOT NULL DEFAULT '[]'`,
    );
    await queryRunner.query(`
      UPDATE "work_society_affiliation_snapshots"
      SET "territory_mode" = 'SPECIFIC_COUNTRIES', "territory_countries" = jsonb_build_array("territory")
    `);
    await queryRunner.query(`ALTER TABLE "work_society_affiliation_snapshots" ALTER COLUMN "territory_mode" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "work_society_affiliation_snapshots" DROP COLUMN "territory"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // --- work_society_affiliation_snapshots ---
    await queryRunner.query(`ALTER TABLE "work_society_affiliation_snapshots" ADD COLUMN "territory" varchar(2)`);
    await queryRunner.query(`
      UPDATE "work_society_affiliation_snapshots"
      SET "territory" = COALESCE("territory_countries"->>0, 'WW')
    `);
    await queryRunner.query(`ALTER TABLE "work_society_affiliation_snapshots" ALTER COLUMN "territory" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "work_society_affiliation_snapshots" DROP COLUMN "territory_countries"`);
    await queryRunner.query(`ALTER TABLE "work_society_affiliation_snapshots" DROP COLUMN "territory_mode"`);

    // --- society_affiliations ---
    await queryRunner.query(`DROP INDEX "public"."UQ_society_affiliation_active_combo"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_society_affiliation_territory_mode"`);

    await queryRunner.query(`ALTER TABLE "society_affiliations" ADD COLUMN "territory" varchar(2)`);
    await queryRunner.query(`
      UPDATE "society_affiliations"
      SET "territory" = COALESCE("territory_countries"->>0, 'WW')
    `);
    await queryRunner.query(`ALTER TABLE "society_affiliations" ALTER COLUMN "territory" SET NOT NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_society_affiliation_territory" ON "society_affiliations" ("territory")`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_society_affiliation_active_combo" ON "society_affiliations"
        ("author_id", "collective_management_society_id", "rights_type", "territory")
      WHERE "status" IN ('PENDING', 'ACTIVE', 'SUSPENDED')
    `);
    await queryRunner.query(`ALTER TABLE "society_affiliations" DROP COLUMN "territory_countries"`);
    await queryRunner.query(`ALTER TABLE "society_affiliations" DROP COLUMN "territory_mode"`);

    await queryRunner.query(`DROP TYPE "public"."society_affiliation_territory_mode_enum"`);
  }
}
