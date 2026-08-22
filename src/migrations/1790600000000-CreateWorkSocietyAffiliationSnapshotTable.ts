import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Snapshot histórico de afiliaciones capturadas al declarar participantes de
 * un expediente (§8, aditivo — no modifica `registration_file_participant`).
 * Reutiliza el enum `society_affiliation_rights_type_enum` creado en
 * 1790500000000 (debe ejecutarse después). `society_affiliation_id` no lleva
 * FK: es una referencia informativa que debe sobrevivir aunque la afiliación
 * origen cambie o se borre — el snapshot es inmutable por diseño.
 */
export class CreateWorkSocietyAffiliationSnapshotTable1790600000000 implements MigrationInterface {
  name = 'CreateWorkSocietyAffiliationSnapshotTable1790600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "work_society_affiliation_snapshots" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "registration_file_id" uuid NOT NULL,
        "registration_file_participant_id" uuid NOT NULL,
        "author_id" uuid NOT NULL,
        "society_affiliation_id" uuid,
        "society_id" uuid NOT NULL,
        "society_name" varchar NOT NULL,
        "cisac_society_id" varchar,
        "rights_type" "public"."society_affiliation_rights_type_enum" NOT NULL,
        "territory" varchar(2) NOT NULL,
        "ipi_name_number" varchar,
        "membership_number" varchar,
        "captured_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_work_society_affiliation_snapshots" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "work_society_affiliation_snapshots" ADD CONSTRAINT "FK_wsas_registration_file" FOREIGN KEY ("registration_file_id") REFERENCES "registration_file"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_society_affiliation_snapshots" ADD CONSTRAINT "FK_wsas_registration_file_participant" FOREIGN KEY ("registration_file_participant_id") REFERENCES "registration_file_participant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`CREATE INDEX "IDX_wsas_registration_file_id" ON "work_society_affiliation_snapshots" ("registration_file_id")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_wsas_registration_file_participant_id" ON "work_society_affiliation_snapshots" ("registration_file_participant_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_wsas_registration_file_participant_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_wsas_registration_file_id"`);
    await queryRunner.query(`ALTER TABLE "work_society_affiliation_snapshots" DROP CONSTRAINT "FK_wsas_registration_file_participant"`);
    await queryRunner.query(`ALTER TABLE "work_society_affiliation_snapshots" DROP CONSTRAINT "FK_wsas_registration_file"`);
    await queryRunner.query(`DROP TABLE "work_society_affiliation_snapshots"`);
  }
}
