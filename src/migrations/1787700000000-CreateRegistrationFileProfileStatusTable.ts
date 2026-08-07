import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Estado de presentación/registro de un perfil activo (SAYCO o DNDA) para un
 * expediente, independiente del `registration_file.status` (que solo mide
 * preparación): en la realidad, cada entidad recibe y registra la obra en
 * momentos distintos, con su propio número de registro oficial.
 */
export class CreateRegistrationFileProfileStatusTable1787700000000 implements MigrationInterface {
  name = 'CreateRegistrationFileProfileStatusTable1787700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."registration_file_profile_submission_status_enum" AS ENUM('pendiente', 'presentado', 'registrado')`,
    );

    await queryRunner.query(`
      CREATE TABLE "registration_file_profile_status" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "registration_file_id" uuid NOT NULL,
        "profile_key" varchar NOT NULL,
        "status" "public"."registration_file_profile_submission_status_enum" NOT NULL DEFAULT 'pendiente',
        "submitted_at" TIMESTAMP WITH TIME ZONE,
        "registered_at" TIMESTAMP WITH TIME ZONE,
        "official_registry_number" varchar,
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_registration_file_profile" UNIQUE ("registration_file_id", "profile_key"),
        CONSTRAINT "PK_registration_file_profile_status" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "registration_file_profile_status" ADD CONSTRAINT "FK_rf_profile_status_registration_file" FOREIGN KEY ("registration_file_id") REFERENCES "registration_file"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "registration_file_profile_status" DROP CONSTRAINT "FK_rf_profile_status_registration_file"`,
    );
    await queryRunner.query(`DROP TABLE "registration_file_profile_status"`);
    await queryRunner.query(`DROP TYPE "public"."registration_file_profile_submission_status_enum"`);
  }
}
