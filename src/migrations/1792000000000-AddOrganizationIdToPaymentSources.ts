import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fuente de pago tokenizada de una organización B2B (§Registro Legal B2B,
 * paso 3: "pago automático"), reutilizando `payment_sources` en vez de
 * duplicar la lógica de tokenización/cobro recurrente.
 */
export class AddOrganizationIdToPaymentSources1792000000000 implements MigrationInterface {
  name = 'AddOrganizationIdToPaymentSources1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payment_sources" ADD COLUMN "organization_id" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_sources_organization_id" ON "payment_sources" ("organization_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_sources_organization_id"`);
    await queryRunner.query(`ALTER TABLE "payment_sources" DROP COLUMN "organization_id"`);
  }
}
