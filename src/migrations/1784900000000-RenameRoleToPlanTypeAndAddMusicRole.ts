import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Refactor Rol → Plan: el campo que determinaba permisos (`role`/`UserRole`)
 * pasa a llamarse `plan_type`/`UserPlanType` en las 5 tablas que lo comparten,
 * y se libera el nombre `role` en `users` para un nuevo atributo descriptivo
 * (`MusicRole`) sin ningún efecto en autorización.
 *
 * `payments` ya tenía una columna `plan_type` (billing tier free/pro) distinta
 * de `role_type` — se renombra primero esa columna a `billing_tier` para
 * liberar el nombre antes de mover `role_type` a `plan_type`.
 */
export class RenameRoleToPlanTypeAndAddMusicRole1784900000000
  implements MigrationInterface
{
  name = 'RenameRoleToPlanTypeAndAddMusicRole1784900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Liberar el nombre "plan_type" en payments (billing tier free/pro pasa a billing_tier)
    await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "plan_type" TO "billing_tier"`);
    await queryRunner.query(`ALTER TYPE "public"."payments_plan_type_enum" RENAME TO "payments_billing_tier_enum"`);

    // 2. Renombrar columnas de permisos → plan_type en las 5 tablas
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "role" TO "plan_type"`);
    await queryRunner.query(`ALTER TABLE "guest" RENAME COLUMN "role" TO "plan_type"`);
    await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "role_type" TO "plan_type"`);
    await queryRunner.query(`ALTER TABLE "pending_registrations" RENAME COLUMN "role" TO "plan_type"`);
    await queryRunner.query(`ALTER TABLE "affiliate_commissions" RENAME COLUMN "plan_role" TO "plan_type"`);

    // 3. Renombrar los tipos ENUM para que coincidan con el nuevo nombre de columna
    await queryRunner.query(`ALTER TYPE "public"."users_role_enum" RENAME TO "users_plan_type_enum"`);
    await queryRunner.query(`ALTER TYPE "public"."guest_role_enum" RENAME TO "guest_plan_type_enum"`);
    await queryRunner.query(`ALTER TYPE "public"."payments_role_type_enum" RENAME TO "payments_plan_type_enum"`);
    await queryRunner.query(`ALTER TYPE "public"."pending_registrations_role_enum" RENAME TO "pending_registrations_plan_type_enum"`);
    await queryRunner.query(`ALTER TYPE "public"."affiliate_commissions_plan_role_enum" RENAME TO "affiliate_commissions_plan_type_enum"`);

    // 4. Renombrar los 3 valores en cada uno de los 5 tipos ya renombrados (admin/invitado/editor no cambian)
    const renamedTypes = [
      'users_plan_type_enum',
      'guest_plan_type_enum',
      'payments_plan_type_enum',
      'pending_registrations_plan_type_enum',
      'affiliate_commissions_plan_type_enum',
    ];
    for (const type of renamedTypes) {
      await queryRunner.query(`ALTER TYPE "public"."${type}" RENAME VALUE 'autor' TO 'plan_autor'`);
      await queryRunner.query(`ALTER TYPE "public"."${type}" RENAME VALUE 'cantautor' TO 'plan_360'`);
      await queryRunner.query(`ALTER TYPE "public"."${type}" RENAME VALUE 'interprete' TO 'plan_descubridor'`);
    }

    // 5. Nueva columna descriptiva en users (MusicRole), con backfill obligatorio
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."users_music_role_enum" AS ENUM('agrupacion','interprete','compositor','productor','ingeniero','manager','a_r'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "role" "public"."users_music_role_enum"`);
    await queryRunner.query(`UPDATE "users" SET "role" = 'compositor' WHERE "role" IS NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 5. Quitar la columna descriptiva nueva
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_music_role_enum"`);

    // 4. Revertir los valores de los 5 tipos
    const renamedTypes = [
      'users_plan_type_enum',
      'guest_plan_type_enum',
      'payments_plan_type_enum',
      'pending_registrations_plan_type_enum',
      'affiliate_commissions_plan_type_enum',
    ];
    for (const type of renamedTypes) {
      await queryRunner.query(`ALTER TYPE "public"."${type}" RENAME VALUE 'plan_descubridor' TO 'interprete'`);
      await queryRunner.query(`ALTER TYPE "public"."${type}" RENAME VALUE 'plan_360' TO 'cantautor'`);
      await queryRunner.query(`ALTER TYPE "public"."${type}" RENAME VALUE 'plan_autor' TO 'autor'`);
    }

    // 3. Revertir los nombres de los tipos ENUM
    await queryRunner.query(`ALTER TYPE "public"."affiliate_commissions_plan_type_enum" RENAME TO "affiliate_commissions_plan_role_enum"`);
    await queryRunner.query(`ALTER TYPE "public"."pending_registrations_plan_type_enum" RENAME TO "pending_registrations_role_enum"`);
    await queryRunner.query(`ALTER TYPE "public"."payments_plan_type_enum" RENAME TO "payments_role_type_enum"`);
    await queryRunner.query(`ALTER TYPE "public"."guest_plan_type_enum" RENAME TO "guest_role_enum"`);
    await queryRunner.query(`ALTER TYPE "public"."users_plan_type_enum" RENAME TO "users_role_enum"`);

    // 2. Revertir los nombres de columna
    await queryRunner.query(`ALTER TABLE "affiliate_commissions" RENAME COLUMN "plan_type" TO "plan_role"`);
    await queryRunner.query(`ALTER TABLE "pending_registrations" RENAME COLUMN "plan_type" TO "role"`);
    await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "plan_type" TO "role_type"`);
    await queryRunner.query(`ALTER TABLE "guest" RENAME COLUMN "plan_type" TO "role"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "plan_type" TO "role"`);

    // 1. Revertir el rename de billing tier en payments
    await queryRunner.query(`ALTER TYPE "public"."payments_billing_tier_enum" RENAME TO "payments_plan_type_enum"`);
    await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "billing_tier" TO "plan_type"`);
  }
}
