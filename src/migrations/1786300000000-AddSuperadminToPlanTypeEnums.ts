import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Añade el valor 'superadmin' a los 5 tipos ENUM de plan_type (permisos) que
 * comparten el enum TypeScript `UserPlanType`: users, guest, payments,
 * pending_registrations y affiliate_commissions. Superadmin hereda todo lo
 * que tiene admin (ver `ADMIN_PLAN_TYPES` en user-plan-type.enum.ts) y añade
 * la posibilidad de restringir endpoints exclusivos a superadmin a futuro.
 */
export class AddSuperadminToPlanTypeEnums1786300000000
  implements MigrationInterface
{
  name = 'AddSuperadminToPlanTypeEnums1786300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const planTypeEnums = [
      'users_plan_type_enum',
      'guest_plan_type_enum',
      'payments_plan_type_enum',
      'pending_registrations_plan_type_enum',
      'affiliate_commissions_plan_type_enum',
    ];
    for (const enumType of planTypeEnums) {
      await queryRunner.query(
        `ALTER TYPE "public"."${enumType}" ADD VALUE IF NOT EXISTS 'superadmin' BEFORE 'admin'`,
      );
    }
  }

  public async down(): Promise<void> {
    // Postgres no soporta DROP VALUE en un tipo ENUM; migración no reversible.
  }
}
