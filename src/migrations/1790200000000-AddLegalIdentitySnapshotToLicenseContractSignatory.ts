import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extiende la firma electrónica de la Licencia de Primer Uso (Ley 527, §7)
 * con el mismo snapshot cifrado de identidad legal que ya se captura al
 * firmar un split — ver `CreateLegalIdentityTables1790100000000`. Cada parte
 * (autor principal, coautores y licenciatario) queda vinculada de forma
 * inequívoca a su identidad real en el momento de firmar la licencia.
 */
export class AddLegalIdentitySnapshotToLicenseContractSignatory1790200000000 implements MigrationInterface {
  name = 'AddLegalIdentitySnapshotToLicenseContractSignatory1790200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "license_contract_signatory" ADD COLUMN IF NOT EXISTS "legal_identity_snapshot" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "license_contract_signatory" DROP COLUMN IF EXISTS "legal_identity_snapshot"`,
    );
  }
}
