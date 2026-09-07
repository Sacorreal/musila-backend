import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Identidad legal del usuario (Ley 527 / Ley 1581): bandera de verificación en
 * `users`, tabla `legal_identities` (1:1, campos identificatorios cifrados en
 * la capa de aplicación con AES-256-GCM — ver `LegalIdentityCipherService`) y
 * el snapshot cifrado vinculado a cada firma electrónica de split (§7).
 */
export class CreateLegalIdentityTables1790100000000 implements MigrationInterface {
  name = 'CreateLegalIdentityTables1790100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "identidad_legal_verificada" boolean NOT NULL DEFAULT false`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."legal_identities_tipo_identificacion_enum" AS ENUM('CC', 'CE', 'PA', 'TI')`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "legal_identities" (
        "id"                          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"                     uuid NOT NULL,
        "primer_nombre"               text NOT NULL,
        "segundo_nombre"              text NOT NULL,
        "primer_apellido"             text NOT NULL,
        "segundo_apellido"            text NOT NULL,
        "tipo_identificacion"         "public"."legal_identities_tipo_identificacion_enum" NOT NULL,
        "numero_identificacion"       text NOT NULL,
        "fecha_expedicion"            text NOT NULL,
        "numero_celular"              text NOT NULL,
        "indicativo_pais"             character varying(8) NOT NULL,
        "verified_at"                 timestamptz,
        "created_at"                  timestamptz NOT NULL DEFAULT now(),
        "updated_at"                  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_legal_identities" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_legal_identities_user" UNIQUE ("user_id"),
        CONSTRAINT "FK_legal_identities_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "split_author" ADD COLUMN IF NOT EXISTS "legal_identity_snapshot" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "split_author" DROP COLUMN IF EXISTS "legal_identity_snapshot"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "legal_identities"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."legal_identities_tipo_identificacion_enum"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "identidad_legal_verificada"`);
  }
}
