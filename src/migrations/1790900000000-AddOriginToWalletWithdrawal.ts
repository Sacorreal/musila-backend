import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Los retiros dejan de solicitarse manualmente: se agrega `origin` a
 * `wallet_withdrawals` para distinguir las solicitudes legadas (`manual`) de
 * las generadas por el cron de pago semanal (`scheduled`, todos los lunes).
 */
export class AddOriginToWalletWithdrawal1790900000000 implements MigrationInterface {
  name = 'AddOriginToWalletWithdrawal1790900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."wallet_withdrawals_origin_enum" AS ENUM('manual', 'scheduled')`);
    await queryRunner.query(
      `ALTER TABLE "wallet_withdrawals" ADD "origin" "public"."wallet_withdrawals_origin_enum" NOT NULL DEFAULT 'manual'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wallet_withdrawals" DROP COLUMN "origin"`);
    await queryRunner.query(`DROP TYPE "public"."wallet_withdrawals_origin_enum"`);
  }
}
