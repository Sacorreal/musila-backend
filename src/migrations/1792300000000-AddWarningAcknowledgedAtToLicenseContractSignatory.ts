import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Registra, con timestamp del servidor, que el firmante reconoció el aviso
 * legal (Ley 527, §7) antes de firmar la Licencia de Primer Uso — evidencia
 * técnica de que la pantalla de advertencia se mostró y fue revisada, en la
 * misma línea que `signedAt`/`ipAddress`/`userAgent` ya capturados en esta tabla.
 */
export class AddWarningAcknowledgedAtToLicenseContractSignatory1792300000000 implements MigrationInterface {
  name = 'AddWarningAcknowledgedAtToLicenseContractSignatory1792300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "license_contract_signatory" ADD COLUMN IF NOT EXISTS "warning_acknowledged_at" timestamptz`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "license_contract_signatory" DROP COLUMN IF EXISTS "warning_acknowledged_at"`,
    );
  }
}
