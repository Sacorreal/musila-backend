import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega 'stripe' al enum `payments_provider_enum`. No usa
 * `ALTER TYPE ... ADD VALUE` porque no puede ejecutarse dentro de la
 * transacción en la que TypeORM corre las migraciones (PostgreSQL exige que
 * el nuevo valor de un enum sea confirmado antes de poder usarse). En su
 * lugar se recrea el tipo con ambos valores y se migra la columna.
 */
export class AddStripeToPaymentProviderEnum1787100000000
  implements MigrationInterface
{
  name = 'AddStripeToPaymentProviderEnum1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."payments_provider_enum_new" AS ENUM('wompi', 'stripe')`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "provider" DROP DEFAULT`,
    );
    await queryRunner.query(`
      ALTER TABLE "payments"
      ALTER COLUMN "provider" TYPE "public"."payments_provider_enum_new"
      USING "provider"::text::"public"."payments_provider_enum_new"
    `);
    await queryRunner.query(`DROP TYPE "public"."payments_provider_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."payments_provider_enum_new" RENAME TO "payments_provider_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "provider" SET DEFAULT 'wompi'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Falla si existen filas con provider = 'stripe' — esperado, ya que
    // revertir esta migración implica que ese proveedor deja de ser válido.
    await queryRunner.query(
      `CREATE TYPE "public"."payments_provider_enum_old" AS ENUM('wompi')`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "provider" DROP DEFAULT`,
    );
    await queryRunner.query(`
      ALTER TABLE "payments"
      ALTER COLUMN "provider" TYPE "public"."payments_provider_enum_old"
      USING "provider"::text::"public"."payments_provider_enum_old"
    `);
    await queryRunner.query(`DROP TYPE "public"."payments_provider_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."payments_provider_enum_old" RENAME TO "payments_provider_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "provider" SET DEFAULT 'wompi'`,
    );
  }
}
