import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tablas del módulo de Licencia de Primer Uso generada en línea:
 * `license_contract` (uno-a-uno con `requested_track`, guarda los términos de
 * la sección 3.4 y el ciclo de vida del documento) y
 * `license_contract_signatory` (compositor, cada coautor del split e
 * intérprete, cada uno con su propia evidencia de firma: IP, user-agent,
 * timestamp del servidor).
 */
export class CreateLicenseContractTables1785400000000 implements MigrationInterface {
  name = 'CreateLicenseContractTables1785400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."license_contract_status_enum" AS ENUM('draft', 'awaiting_signatures', 'signed', 'fulfilled', 'expired', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."license_contract_payment_status_enum" AS ENUM('pendiente', 'pagada', 'en_mora', 'aprobada')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."license_territory_mode_enum" AS ENUM('global', 'specific_countries')`,
    );

    await queryRunner.query(`
      CREATE TABLE "license_contract" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "requested_track_id" uuid NOT NULL,
        "created_by" uuid NOT NULL,
        "validity_date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "territory_mode" "public"."license_territory_mode_enum" NOT NULL,
        "territory_countries" jsonb,
        "advance_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "advance_currency" varchar(3) NOT NULL DEFAULT 'COP',
        "advance_installments_count" integer NOT NULL DEFAULT 1,
        "advance_installments" jsonb,
        "commission_rate" numeric(5,4) NOT NULL,
        "commission_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "total_payable_by_licensee" numeric(12,2) NOT NULL DEFAULT 0,
        "royalty_percentage" numeric(5,2) NOT NULL,
        "distribution_formats" jsonb NOT NULL,
        "advance_distribution" jsonb,
        "status" "public"."license_contract_status_enum" NOT NULL DEFAULT 'draft',
        "payment_status" "public"."license_contract_payment_status_enum" NOT NULL DEFAULT 'aprobada',
        "document_key" varchar,
        "document_url" text,
        "legal_proof_id" uuid,
        "contract_hash" varchar,
        "generated_at" TIMESTAMP WITH TIME ZONE,
        "fully_signed_at" TIMESTAMP WITH TIME ZONE,
        "fulfilled_at" TIMESTAMP WITH TIME ZONE,
        "expired_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_license_contract_requested_track" UNIQUE ("requested_track_id"),
        CONSTRAINT "CHK_license_contract_royalty_percentage" CHECK ("royalty_percentage" >= 0 AND "royalty_percentage" <= 100),
        CONSTRAINT "PK_license_contract" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "license_contract" ADD CONSTRAINT "FK_license_contract_requested_track" FOREIGN KEY ("requested_track_id") REFERENCES "requested_track"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "license_contract" ADD CONSTRAINT "FK_license_contract_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."license_signatory_role_enum" AS ENUM('autor_principal', 'coautor', 'licenciatario')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."license_signatory_status_enum" AS ENUM('pending', 'signed', 'rejected')`,
    );
    await queryRunner.query(`
      CREATE TABLE "license_contract_signatory" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "license_contract_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" "public"."license_signatory_role_enum" NOT NULL,
        "status" "public"."license_signatory_status_enum" NOT NULL DEFAULT 'pending',
        "signed_at" TIMESTAMP WITH TIME ZONE,
        "ip_address" varchar,
        "user_agent" text,
        "rejection_reason" text,
        "split_author_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_license_contract_signatory_user" UNIQUE ("license_contract_id", "user_id"),
        CONSTRAINT "PK_license_contract_signatory" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "license_contract_signatory" ADD CONSTRAINT "FK_license_contract_signatory_contract" FOREIGN KEY ("license_contract_id") REFERENCES "license_contract"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "license_contract_signatory" ADD CONSTRAINT "FK_license_contract_signatory_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "license_contract_signatory" DROP CONSTRAINT "FK_license_contract_signatory_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "license_contract_signatory" DROP CONSTRAINT "FK_license_contract_signatory_contract"`,
    );
    await queryRunner.query(`DROP TABLE "license_contract_signatory"`);
    await queryRunner.query(`DROP TYPE "public"."license_signatory_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."license_signatory_role_enum"`);

    await queryRunner.query(`ALTER TABLE "license_contract" DROP CONSTRAINT "FK_license_contract_created_by"`);
    await queryRunner.query(
      `ALTER TABLE "license_contract" DROP CONSTRAINT "FK_license_contract_requested_track"`,
    );
    await queryRunner.query(`DROP TABLE "license_contract"`);
    await queryRunner.query(`DROP TYPE "public"."license_territory_mode_enum"`);
    await queryRunner.query(`DROP TYPE "public"."license_contract_payment_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."license_contract_status_enum"`);
  }
}
