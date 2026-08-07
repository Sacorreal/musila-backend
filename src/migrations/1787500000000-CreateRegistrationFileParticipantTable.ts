import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Participantes del expediente (dominio 2), independiente de `split_author`:
 * admite participantes sin cuenta Musila (editores, administradores
 * externos). `split_author_id` es un vínculo opcional únicamente para
 * autocompletar datos cuando el participante ya es coautor registrado.
 */
export class CreateRegistrationFileParticipantTable1787500000000 implements MigrationInterface {
  name = 'CreateRegistrationFileParticipantTable1787500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."registration_file_participant_role_enum" AS ENUM('autor', 'compositor', 'compositor_autor', 'arreglista', 'adaptador', 'editor', 'administrador')`,
    );

    await queryRunner.query(`
      CREATE TABLE "registration_file_participant" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "registration_file_id" uuid NOT NULL,
        "split_author_id" uuid,
        "full_name" varchar NOT NULL,
        "document_type" varchar,
        "document_number" varchar,
        "nationality" varchar,
        "management_society" varchar,
        "ipi_code" varchar,
        "sayco_code" varchar,
        "sayco_ip_name" varchar,
        "role" "public"."registration_file_participant_role_enum" NOT NULL,
        "authorial_percentage" numeric(5,2) NOT NULL,
        "mechanical_percentage" numeric(5,2) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_registration_file_participant" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "registration_file_participant" ADD CONSTRAINT "FK_rf_participant_registration_file" FOREIGN KEY ("registration_file_id") REFERENCES "registration_file"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registration_file_participant" ADD CONSTRAINT "FK_rf_participant_split_author" FOREIGN KEY ("split_author_id") REFERENCES "split_author"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "registration_file_participant" DROP CONSTRAINT "FK_rf_participant_split_author"`);
    await queryRunner.query(`ALTER TABLE "registration_file_participant" DROP CONSTRAINT "FK_rf_participant_registration_file"`);
    await queryRunner.query(`DROP TABLE "registration_file_participant"`);
    await queryRunner.query(`DROP TYPE "public"."registration_file_participant_role_enum"`);
  }
}
