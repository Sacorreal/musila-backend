import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Confirmación de la relación editora-autor (Flow 2): agrega el contrato
 * adjunto opcional y la traza de confirmación (fecha + actor) cuando el
 * Publisher's Share se establece a través del flujo de incorporación al
 * roster, en vez de un bulk-edit suelto en `/settings/publisher-share`.
 */
export class AddConfirmationFieldsToPublisherShare1791500000000 implements MigrationInterface {
  name = 'AddConfirmationFieldsToPublisherShare1791500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "publisher_shares" ADD COLUMN "contract_key" varchar`);
    await queryRunner.query(`ALTER TABLE "publisher_shares" ADD COLUMN "contract_url" text`);
    await queryRunner.query(`ALTER TABLE "publisher_shares" ADD COLUMN "confirmed_at" timestamptz`);
    await queryRunner.query(`ALTER TABLE "publisher_shares" ADD COLUMN "confirmed_by_user_id" uuid`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "publisher_shares" DROP COLUMN "confirmed_by_user_id"`);
    await queryRunner.query(`ALTER TABLE "publisher_shares" DROP COLUMN "confirmed_at"`);
    await queryRunner.query(`ALTER TABLE "publisher_shares" DROP COLUMN "contract_url"`);
    await queryRunner.query(`ALTER TABLE "publisher_shares" DROP COLUMN "contract_key"`);
  }
}
