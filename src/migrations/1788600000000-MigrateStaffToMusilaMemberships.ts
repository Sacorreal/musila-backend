import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migra el staff interno al motor unificado (§16.11): cada asignación de
 * `staff_user_roles` se convierte en una OrganizationMembership ACTIVE en el
 * tenant MUSILA más su MembershipRole equivalente.
 *
 * - Roles SYSTEM: Super Admin → SUPER_ADMIN, Admin → PLATFORM_ADMIN,
 *   Editor → CONTENT_MODERATOR, Soporte → SUPPORT.
 * - Roles CUSTOM de staff: se recrean como roles PLATFORM/CUSTOM del tenant
 *   MUSILA con sus permisos mapeados por la misma regla mecánica del seed
 *   1788200000000 (`modulo:recurso:accion` → `platform.<...>`).
 *
 * No borra ninguna tabla staff_* (convivencia y rollback).
 */
export class MigrateStaffToMusilaMemberships1788600000000 implements MigrationInterface {
  name = 'MigrateStaffToMusilaMemberships1788600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Membership ACTIVE en MUSILA para todo el staff con rol asignado.
    await queryRunner.query(`
      INSERT INTO "organization_memberships" ("organization_id", "user_id", "status", "joined_at")
      SELECT o."id", sur."user_id", 'ACTIVE', COALESCE(sur."assigned_at", now())
      FROM "staff_user_roles" sur
      CROSS JOIN "organizations" o
      WHERE o."slug" = 'musila'
      ON CONFLICT ("organization_id", "user_id") DO NOTHING
    `);

    // 2) Roles CUSTOM de staff → roles PLATFORM/CUSTOM del tenant MUSILA.
    await queryRunner.query(`
      INSERT INTO "roles" ("tenant_id", "type", "source", "name", "description")
      SELECT t."id", 'PLATFORM', 'CUSTOM', sr."name", sr."description"
      FROM "staff_roles" sr
      CROSS JOIN "tenants" t
      WHERE t."slug" = 'musila' AND sr."is_system" = false
      ON CONFLICT ("tenant_id", "name", "type") DO NOTHING
    `);

    // 2b) Capabilities de esos roles custom, con el mapping mecánico
    // staff code → platform.* (mismo del seed del catálogo).
    await queryRunner.query(`
      INSERT INTO "role_capabilities" ("role_id", "capability_id", "scope")
      SELECT r."id", c."id", 'PLATFORM'
      FROM "staff_roles" sr
      JOIN "tenants" t ON t."slug" = 'musila'
      JOIN "roles" r ON r."tenant_id" = t."id" AND r."type" = 'PLATFORM' AND r."source" = 'CUSTOM' AND r."name" = sr."name"
      JOIN "staff_role_permissions" srp ON srp."staff_role_id" = sr."id"
      JOIN "staff_permissions" sp ON sp."id" = srp."staff_permission_id"
      JOIN "capabilities" c ON c."key" =
        'platform.' || replace(
          CASE WHEN sp."code" LIKE 'system:%' THEN substring(sp."code" FROM 8) ELSE sp."code" END,
          ':', '.'
        )
      WHERE sr."is_system" = false
      ON CONFLICT ("role_id", "capability_id") DO NOTHING
    `);

    // 3) MembershipRole para roles SYSTEM (mapping 1:1 de los 4 roles base).
    await queryRunner.query(`
      INSERT INTO "membership_roles" ("membership_type", "membership_id", "role_id", "assigned_by")
      SELECT 'ORGANIZATION', om."id", r."id", sur."assigned_by"
      FROM "staff_user_roles" sur
      JOIN "staff_roles" sr ON sr."id" = sur."staff_role_id" AND sr."is_system" = true
      JOIN "organizations" o ON o."slug" = 'musila'
      JOIN "organization_memberships" om ON om."organization_id" = o."id" AND om."user_id" = sur."user_id"
      JOIN "roles" r ON r."tenant_id" = o."tenant_id" AND r."source" = 'SYSTEM' AND r."key" =
        CASE sr."slug"
          WHEN 'super-admin' THEN 'SUPER_ADMIN'
          WHEN 'admin' THEN 'PLATFORM_ADMIN'
          WHEN 'editor' THEN 'CONTENT_MODERATOR'
          WHEN 'soporte' THEN 'SUPPORT'
        END
      WHERE sr."slug" IN ('super-admin', 'admin', 'editor', 'soporte')
      ON CONFLICT ("membership_type", "membership_id", "role_id") DO NOTHING
    `);

    // 3b) MembershipRole para roles CUSTOM portados.
    await queryRunner.query(`
      INSERT INTO "membership_roles" ("membership_type", "membership_id", "role_id", "assigned_by")
      SELECT 'ORGANIZATION', om."id", r."id", sur."assigned_by"
      FROM "staff_user_roles" sur
      JOIN "staff_roles" sr ON sr."id" = sur."staff_role_id" AND sr."is_system" = false
      JOIN "organizations" o ON o."slug" = 'musila'
      JOIN "organization_memberships" om ON om."organization_id" = o."id" AND om."user_id" = sur."user_id"
      JOIN "roles" r ON r."tenant_id" = o."tenant_id" AND r."type" = 'PLATFORM' AND r."source" = 'CUSTOM' AND r."name" = sr."name"
      ON CONFLICT ("membership_type", "membership_id", "role_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "membership_roles"
      WHERE "membership_id" IN (
        SELECT om."id" FROM "organization_memberships" om
        JOIN "organizations" o ON o."id" = om."organization_id"
        WHERE o."slug" = 'musila'
      )
    `);
    await queryRunner.query(`
      DELETE FROM "roles"
      WHERE "source" = 'CUSTOM' AND "type" = 'PLATFORM'
        AND "tenant_id" IN (SELECT "id" FROM "tenants" WHERE "slug" = 'musila')
    `);
    await queryRunner.query(`
      DELETE FROM "organization_memberships"
      WHERE "organization_id" IN (SELECT "id" FROM "organizations" WHERE "slug" = 'musila')
    `);
  }
}
