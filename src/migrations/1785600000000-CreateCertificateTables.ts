import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tablas del Certificado de Autoría emitido automáticamente al publicar
 * una canción: `certificate` (uno-a-uno real con `track`, a diferencia de
 * la tabla polimórfica `legal_proofs`) y `certificate_recipient` (uno por
 * autor, con snapshot inmutable de sus datos y estado de envío del correo).
 */
export class CreateCertificateTables1785600000000 implements MigrationInterface {
  name = 'CreateCertificateTables1785600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."certificate_status_enum" AS ENUM('pending', 'issued', 'failed')`);
    await queryRunner.query(
      `CREATE TYPE "public"."certificate_recipient_status_enum" AS ENUM('pending', 'sent', 'failed', 'skipped_incomplete_data')`,
    );

    await queryRunner.query(`
      CREATE TABLE "certificate" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "registry_number" varchar(40) NOT NULL,
        "track_id" uuid NOT NULL,
        "status" "public"."certificate_status_enum" NOT NULL DEFAULT 'pending',
        "document_key" varchar,
        "document_url" text,
        "track_snapshot" jsonb NOT NULL,
        "retry_count" smallint NOT NULL DEFAULT 0,
        "error_message" text,
        "requested_by_user_id" uuid,
        "issued_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_certificate_registry_number" UNIQUE ("registry_number"),
        CONSTRAINT "UQ_certificate_track" UNIQUE ("track_id"),
        CONSTRAINT "PK_certificate" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "certificate" ADD CONSTRAINT "FK_certificate_track" FOREIGN KEY ("track_id") REFERENCES "track"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`
      CREATE TABLE "certificate_recipient" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "certificate_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "full_name" varchar NOT NULL,
        "email" varchar NOT NULL,
        "type_citizen_id" varchar,
        "citizen_id" varchar,
        "musila_creator_id" varchar,
        "status" "public"."certificate_recipient_status_enum" NOT NULL DEFAULT 'pending',
        "send_attempts" smallint NOT NULL DEFAULT 0,
        "last_error" text,
        "sent_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_certificate_recipient_user" UNIQUE ("certificate_id", "user_id"),
        CONSTRAINT "PK_certificate_recipient" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "certificate_recipient" ADD CONSTRAINT "FK_certificate_recipient_certificate" FOREIGN KEY ("certificate_id") REFERENCES "certificate"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certificate_recipient" DROP CONSTRAINT "FK_certificate_recipient_certificate"`,
    );
    await queryRunner.query(`DROP TABLE "certificate_recipient"`);
    await queryRunner.query(`DROP TYPE "public"."certificate_recipient_status_enum"`);

    await queryRunner.query(`ALTER TABLE "certificate" DROP CONSTRAINT "FK_certificate_track"`);
    await queryRunner.query(`DROP TABLE "certificate"`);
    await queryRunner.query(`DROP TYPE "public"."certificate_status_enum"`);
  }
}
