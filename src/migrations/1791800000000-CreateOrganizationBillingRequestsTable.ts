import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seguimiento del pago inicial de una organización B2B al ser aprobada
 * (§Registro Legal B2B, pasos 3-5): equivalente de `pending_registrations`
 * para organizaciones, desacoplado de `User`/`UserPlanType`.
 */
export class CreateOrganizationBillingRequestsTable1791800000000 implements MigrationInterface {
  name = 'CreateOrganizationBillingRequestsTable1791800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "organization_billing_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "plan_id" uuid NOT NULL,
        "external_reference" varchar NOT NULL,
        "payment_link_url" varchar,
        "amount_in_cents" integer,
        "currency" varchar(10) NOT NULL DEFAULT 'COP',
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "payment_source_id" uuid,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organization_billing_requests" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_obr_external_reference" UNIQUE ("external_reference")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_obr_organization_id_status" ON "organization_billing_requests" ("organization_id", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_obr_organization_id_status"`);
    await queryRunner.query(`DROP TABLE "organization_billing_requests"`);
  }
}
