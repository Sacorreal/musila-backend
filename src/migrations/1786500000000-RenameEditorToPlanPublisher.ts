import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renombra el valor 'editor' a 'plan_publisher' en los 5 tipos ENUM de
 * plan_type que comparten el enum TypeScript `UserPlanType` (ver
 * `RenameRoleToPlanTypeAndAddMusicRole1784900000000` para el listado
 * original de estos 5 tipos).
 */
export class RenameEditorToPlanPublisher1786500000000
  implements MigrationInterface
{
  name = 'RenameEditorToPlanPublisher1786500000000';

  private readonly planTypeEnums = [
    'users_plan_type_enum',
    'guest_plan_type_enum',
    'payments_plan_type_enum',
    'pending_registrations_plan_type_enum',
    'affiliate_commissions_plan_type_enum',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const enumType of this.planTypeEnums) {
      await queryRunner.query(
        `ALTER TYPE "public"."${enumType}" RENAME VALUE 'editor' TO 'plan_publisher'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const enumType of this.planTypeEnums) {
      await queryRunner.query(
        `ALTER TYPE "public"."${enumType}" RENAME VALUE 'plan_publisher' TO 'editor'`,
      );
    }
  }
}
