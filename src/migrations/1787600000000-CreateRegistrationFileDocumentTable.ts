import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Documentos tipificados del expediente (dominio 8). Cada re-subida crea una
 * fila nueva con `version` incrementada (no se sobreescribe), preservando el
 * historial para trazabilidad. `legal_proof_id` es una referencia
 * polimórfica a `legal_proofs`, sin FK física (mismo criterio que el resto
 * del esquema de evidencia legal).
 */
export class CreateRegistrationFileDocumentTable1787600000000 implements MigrationInterface {
  name = 'CreateRegistrationFileDocumentTable1787600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."registration_file_document_type_enum" AS ENUM(
        'letra', 'partitura', 'audio_mp3', 'audio_wav', 'caratula',
        'contrato_editorial', 'contrato_encargo', 'registro_dnda',
        'declaracion_sayco', 'autorizacion', 'licencia', 'certificado_pi', 'otro'
      )
    `);
    await queryRunner.query(
      `CREATE TYPE "public"."registration_file_document_status_enum" AS ENUM('pendiente', 'cargado', 'rechazado')`,
    );

    await queryRunner.query(`
      CREATE TABLE "registration_file_document" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "registration_file_id" uuid NOT NULL,
        "document_type" "public"."registration_file_document_type_enum" NOT NULL,
        "file_key" varchar NOT NULL,
        "file_url" text NOT NULL,
        "file_name" varchar NOT NULL,
        "mime_type" varchar NOT NULL,
        "file_size_bytes" bigint NOT NULL,
        "version" int NOT NULL DEFAULT 1,
        "status" "public"."registration_file_document_status_enum" NOT NULL DEFAULT 'cargado',
        "sha256_hash" char(64),
        "legal_proof_id" uuid,
        "uploaded_by_user_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_registration_file_document" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "registration_file_document" ADD CONSTRAINT "FK_rf_document_registration_file" FOREIGN KEY ("registration_file_id") REFERENCES "registration_file"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "registration_file_document" DROP CONSTRAINT "FK_rf_document_registration_file"`);
    await queryRunner.query(`DROP TABLE "registration_file_document"`);
    await queryRunner.query(`DROP TYPE "public"."registration_file_document_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."registration_file_document_type_enum"`);
  }
}
