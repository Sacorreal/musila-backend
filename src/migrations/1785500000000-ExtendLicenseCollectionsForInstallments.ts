import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extiende `license_collections` para soportar múltiples cuotas del anticipo
 * de un `license_contract` (antes solo admitía un cobro por solicitud, sin
 * relación con contratos). Columnas nullable para no romper cobros del flujo
 * legacy de precio único, que sigue sin usar `license_contract_id`.
 */
export class ExtendLicenseCollectionsForInstallments1785500000000 implements MigrationInterface {
  name = 'ExtendLicenseCollectionsForInstallments1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "license_collections" ADD "license_contract_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "license_collections" ADD "installment_number" integer NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(`ALTER TABLE "license_collections" ADD "payment_reference" varchar`);
    await queryRunner.query(
      `ALTER TABLE "license_collections" ADD CONSTRAINT "UQ_license_collections_payment_reference" UNIQUE ("payment_reference")`,
    );
    await queryRunner.query(
      `ALTER TABLE "license_collections" ADD CONSTRAINT "FK_license_collections_license_contract" FOREIGN KEY ("license_contract_id") REFERENCES "license_contract"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "license_collections" DROP CONSTRAINT "FK_license_collections_license_contract"`,
    );
    await queryRunner.query(
      `ALTER TABLE "license_collections" DROP CONSTRAINT "UQ_license_collections_payment_reference"`,
    );
    await queryRunner.query(`ALTER TABLE "license_collections" DROP COLUMN "payment_reference"`);
    await queryRunner.query(`ALTER TABLE "license_collections" DROP COLUMN "installment_number"`);
    await queryRunner.query(`ALTER TABLE "license_collections" DROP COLUMN "license_contract_id"`);
  }
}
