import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Autodeclaración de la relación editora-autor (Flow 1): agrega IPI y
 * porcentaje de participación al contrato editorial ya existente, y hace el
 * documento opcional (antes era obligatorio para todo `PublishingContract`).
 */
export class AddIpiAndPercentageToPublishingContract1791400000000 implements MigrationInterface {
  name = 'AddIpiAndPercentageToPublishingContract1791400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "publishing_contract" ADD COLUMN "ipi_number" varchar(50)`);
    await queryRunner.query(`ALTER TABLE "publishing_contract" ADD COLUMN "percentage" numeric(5,2)`);
    await queryRunner.query(`ALTER TABLE "publishing_contract" ALTER COLUMN "document_key" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "publishing_contract" ALTER COLUMN "document_url" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "publishing_contract" ALTER COLUMN "document_url" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "publishing_contract" ALTER COLUMN "document_key" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "publishing_contract" DROP COLUMN "percentage"`);
    await queryRunner.query(`ALTER TABLE "publishing_contract" DROP COLUMN "ipi_number"`);
  }
}
