import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabla principal del expediente de registro (Expediente de Obra Musical):
 * 1:1 con `track`, agrupa Información General (columnas propias) y los
 * dominios 3/5/6/7 (jsonb, bloques atómicos sin sub-listas ni documentos
 * propios). Participantes y Documentos viven en tablas separadas por su
 * cardinalidad N real (ver migraciones siguientes). El estado de
 * presentación/registro por perfil activo (SAYCO/DNDA) vive en
 * `registration_file_profile_status`, no aquí — este `status` solo mide
 * *preparación* (En construcción → Listo para presentar).
 */
export class CreateRegistrationFileTable1787400000000 implements MigrationInterface {
  name = 'CreateRegistrationFileTable1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."registration_file_status_enum" AS ENUM('en_construccion', 'incompleto', 'validado_parcialmente', 'listo_para_presentar')`,
    );
    await queryRunner.query(`CREATE TYPE "public"."work_state_enum" AS ENUM('inedita', 'publicada')`);

    await queryRunner.query(`
      CREATE TABLE "registration_file" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "case_number" varchar(30) NOT NULL,
        "track_id" uuid NOT NULL,
        "created_by" uuid NOT NULL,
        "status" "public"."registration_file_status_enum" NOT NULL DEFAULT 'en_construccion',
        "active_profile_keys" jsonb NOT NULL DEFAULT '[]',
        "title" varchar NOT NULL,
        "alternative_titles" jsonb NOT NULL DEFAULT '[]',
        "language" varchar NOT NULL,
        "genre" varchar NOT NULL,
        "ritmo" varchar,
        "duration_seconds" int,
        "creation_date" date,
        "creation_place" varchar,
        "work_state" "public"."work_state_enum",
        "version" varchar,
        "description" text,
        "internal_code" varchar NOT NULL,
        "has_publishing_deal" boolean NOT NULL DEFAULT false,
        "publishing_contract_id" uuid,
        "publishing_administered_percentage" numeric(5,2),
        "phonogram_data" jsonb,
        "derivative_work_data" jsonb,
        "commissioned_work_data" jsonb,
        "ai_usage_data" jsonb,
        "completeness_snapshot" jsonb,
        "generated_pdf_key" varchar,
        "generated_pdf_url" text,
        "generated_zip_key" varchar,
        "generated_zip_url" text,
        "generated_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_registration_file_case_number" UNIQUE ("case_number"),
        CONSTRAINT "UQ_registration_file_internal_code" UNIQUE ("internal_code"),
        CONSTRAINT "UQ_registration_file_track" UNIQUE ("track_id"),
        CONSTRAINT "PK_registration_file" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "registration_file" ADD CONSTRAINT "FK_registration_file_track" FOREIGN KEY ("track_id") REFERENCES "track"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registration_file" ADD CONSTRAINT "FK_registration_file_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registration_file" ADD CONSTRAINT "FK_registration_file_publishing_contract" FOREIGN KEY ("publishing_contract_id") REFERENCES "publishing_contract"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "registration_file" DROP CONSTRAINT "FK_registration_file_publishing_contract"`);
    await queryRunner.query(`ALTER TABLE "registration_file" DROP CONSTRAINT "FK_registration_file_created_by"`);
    await queryRunner.query(`ALTER TABLE "registration_file" DROP CONSTRAINT "FK_registration_file_track"`);
    await queryRunner.query(`DROP TABLE "registration_file"`);
    await queryRunner.query(`DROP TYPE "public"."work_state_enum"`);
    await queryRunner.query(`DROP TYPE "public"."registration_file_status_enum"`);
  }
}
