import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cláusula opcional de información personalizada en `license_contract`:
 * texto libre (sin límite de caracteres) más un valor a pagar y su moneda
 * (COP/USD), ambos opcionales dentro de la cláusula.
 */
export class AddCustomInfoToLicenseContract1786600000000
  implements MigrationInterface
{
  name = 'AddCustomInfoToLicenseContract1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "license_contract" ADD COLUMN "has_custom_info" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "license_contract" ADD COLUMN "custom_info" text`);
    await queryRunner.query(
      `ALTER TABLE "license_contract" ADD COLUMN "custom_amount" numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "license_contract" ADD COLUMN "custom_currency" varchar(3)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "license_contract" DROP COLUMN "custom_currency"`);
    await queryRunner.query(`ALTER TABLE "license_contract" DROP COLUMN "custom_amount"`);
    await queryRunner.query(`ALTER TABLE "license_contract" DROP COLUMN "custom_info"`);
    await queryRunner.query(`ALTER TABLE "license_contract" DROP COLUMN "has_custom_info"`);
  }
}
