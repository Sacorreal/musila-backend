import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Títulos alternativos de la obra: metadato opcional que almacena uno o varios
 * nombres alternativos como arreglo de strings en formato jsonb (mismo patrón
 * de almacenamiento que `externals_ids`).
 */
export class AddAlternativeTitlesToTracks1790000000000 implements MigrationInterface {
  name = 'AddAlternativeTitlesToTracks1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "track" ADD COLUMN "alternative_titles" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "track" DROP COLUMN "alternative_titles"`);
  }
}
