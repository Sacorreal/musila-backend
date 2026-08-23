import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Siembra la capability del Editorial Command Center (Health Score),
 * restringida a organizaciones tipo PUBLISHER y a usuarios con plan Autor o
 * 360 (Feature 8 / Flow 5 del requerimiento):
 *
 * - Vía organización: `organization_types: ['PUBLISHER']` en el catálogo (el
 *   propio `AuthorizationService` deniega `ORGANIZATION_TYPE_DENIED` para
 *   cualquier otro tipo) + grant a `ORGANIZATION_ADMIN` (mismo patrón que
 *   `reports.view` en 1788200000000).
 * - Vía plan personal: grant a `AUTOR_FREE/PREMIUM` y `360_FREE/PREMIUM` con
 *   `allowedScopes: ['OWN']` (mismo patrón que 1790800000000), para que el
 *   catálogo propio del autor quede scopeado automáticamente.
 */
export class SeedEditorialCommandCenterCapability1791300000000 implements MigrationInterface {
  name = 'SeedEditorialCommandCenterCapability1791300000000';

  private readonly capabilityKey = 'editorial.command_center.view';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "capabilities"
        ("key", "name", "description", "domain", "resource", "action", "assignable_to", "allowed_scopes", "organization_types", "is_system", "is_active", "version")
      VALUES
        ('${this.capabilityKey}', 'Ver Editorial Command Center', 'Consultar el Health Score documental/legal/de propiedad intelectual/comercial del catálogo', 'EDITORIAL', 'health_score', 'VIEW', ARRAY['ORGANIZATION_MEMBER', 'PLATFORM_MEMBER']::text[], ARRAY['ORGANIZATION', 'OWN']::text[], ARRAY['PUBLISHER']::text[], true, true, 1)
      ON CONFLICT ("key") DO NOTHING
    `);

    // ── Publisher (organización): rol SYSTEM admin del workspace ───────────
    await queryRunner.query(`
      INSERT INTO "role_capabilities" ("role_id", "capability_id", "scope")
      SELECT r."id", c."id", 'ORGANIZATION'
      FROM "roles" r
      JOIN "tenants" t ON t."id" = r."tenant_id" AND t."slug" = 'musila'
      CROSS JOIN "capabilities" c
      WHERE r."key" = 'ORGANIZATION_ADMIN' AND r."source" = 'SYSTEM' AND c."key" = '${this.capabilityKey}'
      ON CONFLICT ("role_id", "capability_id") DO NOTHING
    `);

    // ── Autor / 360 (plan personal) ─────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "plan_capabilities" ("plan_id", "capability_id")
      SELECT p."id", c."id"
      FROM "plans" p
      CROSS JOIN "capabilities" c
      WHERE p."key" IN ('AUTOR_FREE', 'AUTOR_PREMIUM', '360_FREE', '360_PREMIUM')
        AND c."key" = '${this.capabilityKey}'
      ON CONFLICT ("plan_id", "capability_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_capabilities" WHERE "capability_id" IN (SELECT "id" FROM "capabilities" WHERE "key" = '${this.capabilityKey}')
    `);
    await queryRunner.query(`
      DELETE FROM "plan_capabilities" WHERE "capability_id" IN (SELECT "id" FROM "capabilities" WHERE "key" = '${this.capabilityKey}')
    `);
    await queryRunner.query(`DELETE FROM "capabilities" WHERE "key" = '${this.capabilityKey}'`);
  }
}
