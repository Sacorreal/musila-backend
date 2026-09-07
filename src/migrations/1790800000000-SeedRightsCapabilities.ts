import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Siembra las 4 capabilities del dominio `RIGHTS` (§12 del requerimiento):
 *
 * - `rights.society_affiliation.view` / `.manage` → autores, scope `OWN`
 *   (otorgadas vía `plan_capabilities` a los planes personales AUTOR/360,
 *   mismo patrón que 1788400000000). `allowedScopes: ['OWN']` es lo que hace
 *   que `AuthorizationService.defaultPersonalScope()` resuelva el scope como
 *   "propio" automáticamente para un grant de plan personal.
 * - `rights.society_catalog.view` / `.manage` → staff, scope `PLATFORM`
 *   (otorgadas vía `role_capabilities` a roles SYSTEM, mismo patrón que
 *   1788300000000). No llevan prefijo `platform.`, así que no quedan
 *   cubiertas por el wildcard `platform.%` que ya tienen SUPER_ADMIN/
 *   PLATFORM_ADMIN — requieren grant explícito aquí.
 */
export class SeedRightsCapabilities1790800000000 implements MigrationInterface {
  name = 'SeedRightsCapabilities1790800000000';

  private readonly capabilityKeys = [
    'rights.society_affiliation.view',
    'rights.society_affiliation.manage',
    'rights.society_catalog.view',
    'rights.society_catalog.manage',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "capabilities"
        ("key", "name", "description", "domain", "resource", "action", "assignable_to", "allowed_scopes", "organization_types", "is_system", "is_active", "version")
      VALUES
        ('rights.society_affiliation.view', 'Ver afiliaciones a sociedades', 'Consultar las afiliaciones propias a sociedades de gestión colectiva', 'RIGHTS', 'society_affiliation', 'VIEW', ARRAY['PLATFORM_MEMBER']::text[], ARRAY['OWN']::text[], '{}'::text[], true, true, 1),
        ('rights.society_affiliation.manage', 'Gestionar afiliaciones a sociedades', 'Crear, actualizar y finalizar las propias afiliaciones a sociedades de gestión colectiva', 'RIGHTS', 'society_affiliation', 'MANAGE', ARRAY['PLATFORM_MEMBER']::text[], ARRAY['OWN']::text[], '{}'::text[], true, true, 1),
        ('rights.society_catalog.view', 'Ver catálogo de sociedades', 'Consultar el catálogo maestro de sociedades de gestión colectiva', 'RIGHTS', 'society_catalog', 'VIEW', ARRAY['PLATFORM_MEMBER']::text[], ARRAY['PLATFORM']::text[], '{}'::text[], true, true, 1),
        ('rights.society_catalog.manage', 'Gestionar catálogo de sociedades', 'Crear, editar y depreciar entradas del catálogo maestro de sociedades de gestión colectiva', 'RIGHTS', 'society_catalog', 'MANAGE', ARRAY['PLATFORM_MEMBER']::text[], ARRAY['PLATFORM']::text[], '{}'::text[], true, true, 1)
      ON CONFLICT ("key") DO NOTHING
    `);

    // ── Autores: plan personal → OWN ───────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "plan_capabilities" ("plan_id", "capability_id")
      SELECT p."id", c."id"
      FROM "plans" p
      CROSS JOIN "capabilities" c
      WHERE p."key" IN ('AUTOR_FREE', 'AUTOR_PREMIUM', '360_FREE', '360_PREMIUM')
        AND c."key" IN ('rights.society_affiliation.view', 'rights.society_affiliation.manage')
      ON CONFLICT ("plan_id", "capability_id") DO NOTHING
    `);

    // ── Staff: roles SYSTEM de plataforma → PLATFORM ───────────────────────
    await this.grantToRole(queryRunner, 'SUPER_ADMIN', `c."key" IN ('rights.society_catalog.view', 'rights.society_catalog.manage')`);
    await this.grantToRole(queryRunner, 'PLATFORM_ADMIN', `c."key" IN ('rights.society_catalog.view', 'rights.society_catalog.manage')`);
    await this.grantToRole(queryRunner, 'LEGAL', `c."key" IN ('rights.society_catalog.view', 'rights.society_catalog.manage')`);
    await this.grantToRole(queryRunner, 'ANALYST', `c."key" = 'rights.society_catalog.view'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const keys = this.capabilityKeys.map((key) => `'${key}'`).join(', ');

    await queryRunner.query(`
      DELETE FROM "role_capabilities" WHERE "capability_id" IN (SELECT "id" FROM "capabilities" WHERE "key" IN (${keys}))
    `);
    await queryRunner.query(`
      DELETE FROM "plan_capabilities" WHERE "capability_id" IN (SELECT "id" FROM "capabilities" WHERE "key" IN (${keys}))
    `);
    await queryRunner.query(`DELETE FROM "capabilities" WHERE "key" IN (${keys})`);
  }

  /** Asigna al rol SYSTEM (por key, tenant musila) las capabilities que cumplan la condición SQL. Mismo helper que 1788300000000. */
  private async grantToRole(queryRunner: QueryRunner, roleKey: string, capabilityCondition: string): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "role_capabilities" ("role_id", "capability_id", "scope")
      SELECT r."id", c."id", 'PLATFORM'
      FROM "roles" r
      JOIN "tenants" t ON t."id" = r."tenant_id" AND t."slug" = 'musila'
      CROSS JOIN "capabilities" c
      WHERE r."key" = '${roleKey}' AND r."source" = 'SYSTEM' AND (${capabilityCondition})
      ON CONFLICT ("role_id", "capability_id") DO NOTHING
    `);
  }
}
