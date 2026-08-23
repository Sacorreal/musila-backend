import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tablas del módulo Bank Information (cobro de anticipos de licencia):
 * `user_bank_information` (perfil de cobro cifrado, 1 fila por usuario,
 * editable a futuro) y `bank_information_requests` (registro de control por
 * usuario/contrato — rastrea notificación y estado pendiente/completado para
 * evitar solicitudes duplicadas, ver Flow 1 y Flow 4 del requerimiento).
 */
export class CreateBankInformationTables1791100000000 implements MigrationInterface {
  name = 'CreateBankInformationTables1791100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."bank_information_method_enum" AS ENUM('wompi_colombia', 'global66_international')`,
    );
    await queryRunner.query(`
      CREATE TABLE "user_bank_information" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "method" "public"."bank_information_method_enum" NOT NULL,
        "encrypted_payload" text NOT NULL,
        "legal_notice_accepted_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_bank_information" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_user_bank_information_user" ON "user_bank_information" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_bank_information" ADD CONSTRAINT "FK_user_bank_information_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."bank_information_request_status_enum" AS ENUM('pending', 'completed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."bank_information_completion_reason_enum" AS ENUM('submitted', 'already_configured')`,
    );
    await queryRunner.query(`
      CREATE TABLE "bank_information_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "license_contract_id" uuid NOT NULL,
        "track_title" character varying NOT NULL,
        "advance_amount" numeric(12,2) NOT NULL,
        "status" "public"."bank_information_request_status_enum" NOT NULL DEFAULT 'pending',
        "completion_reason" "public"."bank_information_completion_reason_enum",
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "notification_attempts" integer NOT NULL DEFAULT 0,
        "notification_last_error" text,
        "notified_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_bank_info_request_user_contract" UNIQUE ("user_id", "license_contract_id"),
        CONSTRAINT "PK_bank_information_requests" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_bank_info_request_user_status" ON "bank_information_requests" ("user_id", "status")`,
    );
    await queryRunner.query(
      `ALTER TABLE "bank_information_requests" ADD CONSTRAINT "FK_bank_info_request_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bank_information_requests" ADD CONSTRAINT "FK_bank_info_request_license_contract" FOREIGN KEY ("license_contract_id") REFERENCES "license_contract"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bank_information_requests" DROP CONSTRAINT "FK_bank_info_request_license_contract"`);
    await queryRunner.query(`ALTER TABLE "bank_information_requests" DROP CONSTRAINT "FK_bank_info_request_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bank_info_request_user_status"`);
    await queryRunner.query(`DROP TABLE "bank_information_requests"`);
    await queryRunner.query(`DROP TYPE "public"."bank_information_completion_reason_enum"`);
    await queryRunner.query(`DROP TYPE "public"."bank_information_request_status_enum"`);

    await queryRunner.query(`ALTER TABLE "user_bank_information" DROP CONSTRAINT "FK_user_bank_information_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_bank_information_user"`);
    await queryRunner.query(`DROP TABLE "user_bank_information"`);
    await queryRunner.query(`DROP TYPE "public"."bank_information_method_enum"`);
  }
}
