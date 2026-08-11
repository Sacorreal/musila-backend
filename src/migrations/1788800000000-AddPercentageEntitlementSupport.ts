import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Soporte para entitlements porcentuales (§2): `is_active` (activar/desactivar
 * un entitlement del catálogo) y `applies_to_organization_types` (restringir a
 * tipos de organización, p. ej. LABEL/MANAGEMENT para
 * `marketplace.transaction_fee`). El tipo `PERCENTAGE` no requiere DDL: la
 * columna `type` ya es varchar.
 */
export class AddPercentageEntitlementSupport1788800000000 implements MigrationInterface {
  name = 'AddPercentageEntitlementSupport1788800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "entitlements" ADD COLUMN IF NOT EXISTS "applies_to_organization_types" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "entitlements" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "entitlements" DROP COLUMN IF EXISTS "is_active"`);
    await queryRunner.query(
      `ALTER TABLE "entitlements" DROP COLUMN IF EXISTS "applies_to_organization_types"`,
    );
  }
}
