import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Placeholder de datos bancarios en `users` (jsonb), mismo shape que
 * `affiliates.bank_account`. Lo usa el módulo Wallet para las solicitudes de
 * retiro hasta que exista un módulo dedicado de verificación bancaria.
 */
export class AddBankAccountToUsers1785700000000 implements MigrationInterface {
  name = 'AddBankAccountToUsers1785700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bank_account" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "bank_account"`);
  }
}
