import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabla del módulo de gestión de cobros: `license_collections` registra los
 * anticipos pactados sobre una `requested_track` (licencia de primer uso), su
 * enlace de pago (token firmado + expiración) y el ciclo de estados
 * (pendiente → enlace_enviado → pagado | en_mora).
 */
export class CreateLicenseCollectionsTable1785300000000 implements MigrationInterface {
  name = 'CreateLicenseCollectionsTable1785300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."license_collection_status_enum" AS ENUM('pendiente', 'enlace_enviado', 'pagado', 'en_mora')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."license_collection_channel_enum" AS ENUM('email', 'in_app')`,
    );
    await queryRunner.query(`
      CREATE TABLE "license_collections" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "requested_track_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "due_date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" "public"."license_collection_status_enum" NOT NULL DEFAULT 'pendiente',
        "link_token" varchar,
        "link_expires_at" TIMESTAMP WITH TIME ZONE,
        "link_channel" "public"."license_collection_channel_enum",
        "link_sent_at" TIMESTAMP WITH TIME ZONE,
        "send_attempts" integer NOT NULL DEFAULT 0,
        "last_attempt_at" TIMESTAMP WITH TIME ZONE,
        "last_send_error" text,
        "paid_at" TIMESTAMP WITH TIME ZONE,
        "overdue_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_license_collections" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "license_collections" ADD CONSTRAINT "FK_license_collections_requested_track" FOREIGN KEY ("requested_track_id") REFERENCES "requested_track"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "license_collections" DROP CONSTRAINT "FK_license_collections_requested_track"`,
    );
    await queryRunner.query(`DROP TABLE "license_collections"`);
    await queryRunner.query(`DROP TYPE "public"."license_collection_channel_enum"`);
    await queryRunner.query(`DROP TYPE "public"."license_collection_status_enum"`);
  }
}
