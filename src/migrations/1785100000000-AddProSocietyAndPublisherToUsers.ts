import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProSocietyAndPublisherToUsers1785100000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pro_society" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ipi_number" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "publisher" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "publisher"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "ipi_number"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "pro_society"`);
  }
}
