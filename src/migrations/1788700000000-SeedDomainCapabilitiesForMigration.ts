import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lote 0 (PRERREQUISITO) de la migración de `@AllowedPlans`/`isAdminPlanType`
 * al motor de capabilities. Siembra lo que las recetas B/C/D/E necesitan y que
 * el catálogo base (1788200000000) todavía no tenía:
 *
 * 1. Capabilities de dominio nuevas: `playlist.manage`, `invite.create`.
 * 2. Ampliación de `assignable_to` de `license.view`/`license.manage` para
 *    incluir `PLATFORM_MEMBER`. Sin esto, `AuthorizationService.collectRoleGrants`
 *    descarta el grant al resolver roles PLATFORM (filtra por `assignable_to`),
 *    por lo que el staff nunca obtendría esas capabilities aunque se las asigne.
 *    La ruta de planes personales no filtra por `assignable_to`, así que los
 *    planes AUTOR/360 no requieren este ajuste.
 * 3. Entitlements de recursos activos: `playlists.active`, `collaborators.active`
 *    (LIMIT/NONE/USER → periodKey 'lifetime'), con sus valores por plan tomados
 *    de `plan-limits.config.ts` y el backfill de `usage` (COUNT en vivo actual),
 *    imprescindible antes de activar `@ConsumeEntitlement` (Receta C).
 * 4. plan_capabilities: `playlist.manage`+`invite.create` para 360/DESCUBRIDOR/GUEST;
 *    `license.view`+`license.manage` para AUTOR/360 (el dueño ve/aprueba solicitudes).
 * 5. role_capabilities de negocio para los roles PLATFORM SUPER_ADMIN/PLATFORM_ADMIN
 *    (scope PLATFORM), para que el staff opere contenido sin bypass por código.
 *
 * Patrón idempotente (ON CONFLICT DO NOTHING) como el resto de seeds.
 */
export class SeedDomainCapabilitiesForMigration1788700000000
  implements MigrationInterface
{
  name = 'SeedDomainCapabilitiesForMigration1788700000000';

  /** Capabilities de negocio que el staff PLATFORM necesita operar (scope PLATFORM). */
  private readonly platformBusinessCapabilities = [
    'playlist.manage',
    'invite.create',
    'catalog.view',
    'catalog.manage',
    'track.create',
    'track.edit',
    'track.publish',
    'license.view',
    'license.manage',
  ];

  private readonly platformRoleKeys = ['SUPER_ADMIN', 'PLATFORM_ADMIN'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Capabilities de dominio nuevas.
    await queryRunner.query(`
      INSERT INTO "capabilities"
        ("key", "name", "description", "domain", "resource", "action", "assignable_to", "allowed_scopes", "organization_types", "is_system", "is_active", "version")
      VALUES
        ('playlist.manage', 'Gestionar playlists', 'Crear, editar y eliminar playlists y sus colaboradores', 'PLAYLIST', 'playlist', 'MANAGE',
          ARRAY['ORGANIZATION_MEMBER', 'ROSTER_MEMBER', 'PLATFORM_MEMBER']::text[], ARRAY['OWN', 'ORGANIZATION', 'PLATFORM']::text[], '{}'::text[], true, true, 1),
        ('invite.create', 'Crear invitaciones', 'Invitar a personas externas a colaborar en la plataforma', 'INVITE', 'invite', 'CREATE',
          ARRAY['ORGANIZATION_MEMBER', 'ROSTER_MEMBER', 'PLATFORM_MEMBER']::text[], ARRAY['OWN', 'ORGANIZATION', 'PLATFORM']::text[], '{}'::text[], true, true, 1)
      ON CONFLICT ("key") DO NOTHING
    `);

    // 2) Ampliar assignable_to de license.view/license.manage con PLATFORM_MEMBER.
    await queryRunner.query(`
      UPDATE "capabilities"
      SET "assignable_to" = array_append("assignable_to", 'PLATFORM_MEMBER')
      WHERE "key" IN ('license.view', 'license.manage')
        AND NOT ('PLATFORM_MEMBER' = ANY("assignable_to"))
    `);

    // 3) Entitlements de recursos activos.
    await queryRunner.query(`
      INSERT INTO "entitlements" ("key", "name", "type", "default_period", "scope", "description")
      VALUES
        ('playlists.active', 'Playlists activas', 'LIMIT', 'NONE', 'USER', 'Cantidad de playlists activas simultáneas del usuario'),
        ('collaborators.active', 'Colaboradores activos', 'LIMIT', 'NONE', 'USER', 'Cantidad de colaboradores activos en las playlists del usuario')
      ON CONFLICT ("key") DO NOTHING
    `);

    // 4) plan_capabilities.
    const planCapabilityMap: Array<[plansIn: string, capabilitiesIn: string]> = [
      // playlist.manage + invite.create: perfiles con playlists (INVITADO incluido, como legacy).
      [
        `'360_FREE', '360_PREMIUM', 'DESCUBRIDOR_FREE', 'DESCUBRIDOR_PREMIUM', 'GUEST'`,
        `'playlist.manage', 'invite.create'`,
      ],
      // license.view + license.manage: el dueño de la obra ve y aprueba las solicitudes recibidas.
      [
        `'AUTOR_FREE', 'AUTOR_PREMIUM', '360_FREE', '360_PREMIUM'`,
        `'license.view', 'license.manage'`,
      ],
    ];

    for (const [plansIn, capabilitiesIn] of planCapabilityMap) {
      await queryRunner.query(`
        INSERT INTO "plan_capabilities" ("plan_id", "capability_id")
        SELECT p."id", c."id"
        FROM "plans" p
        CROSS JOIN "capabilities" c
        WHERE p."key" IN (${plansIn}) AND c."key" IN (${capabilitiesIn})
        ON CONFLICT ("plan_id", "capability_id") DO NOTHING
      `);
    }

    // 5) role_capabilities de negocio para roles PLATFORM (scope PLATFORM).
    const capabilityList = this.platformBusinessCapabilities
      .map((key) => `'${key}'`)
      .join(', ');
    const roleList = this.platformRoleKeys.map((key) => `'${key}'`).join(', ');
    await queryRunner.query(`
      INSERT INTO "role_capabilities" ("role_id", "capability_id", "scope")
      SELECT r."id", c."id", 'PLATFORM'
      FROM "roles" r
      JOIN "tenants" t ON t."id" = r."tenant_id" AND t."slug" = 'musila'
      CROSS JOIN "capabilities" c
      WHERE r."key" IN (${roleList}) AND r."source" = 'SYSTEM' AND r."type" = 'PLATFORM'
        AND c."key" IN (${capabilityList})
      ON CONFLICT ("role_id", "capability_id") DO NOTHING
    `);

    // 6) plan_entitlements (valores de plan-limits.config.ts; period NONE → lifetime).
    await queryRunner.query(`
      INSERT INTO "plan_entitlements" ("plan_id", "entitlement_id", "limit", "unlimited", "period")
      SELECT p."id", e."id", v."limit", v.unlimited, v.period
      FROM (VALUES
        ('360_FREE',            'playlists.active',     1,    false, 'NONE'),
        ('360_PREMIUM',         'playlists.active',     NULL, true,  'NONE'),
        ('DESCUBRIDOR_FREE',    'playlists.active',     1,    false, 'NONE'),
        ('DESCUBRIDOR_PREMIUM', 'playlists.active',     NULL, true,  'NONE'),
        ('360_FREE',            'collaborators.active', 2,    false, 'NONE'),
        ('360_PREMIUM',         'collaborators.active', 5,    false, 'NONE'),
        ('DESCUBRIDOR_FREE',    'collaborators.active', 2,    false, 'NONE'),
        ('DESCUBRIDOR_PREMIUM', 'collaborators.active', 5,    false, 'NONE')
      ) AS v(plan_key, entitlement_key, "limit", unlimited, period)
      JOIN "plans" p ON p."key" = v.plan_key
      JOIN "entitlements" e ON e."key" = v.entitlement_key
      ON CONFLICT ("plan_id", "entitlement_id") DO NOTHING
    `);

    // 7) Backfill de usage (mismo criterio que plan-limits.service.ts:countResource).
    //    playlists.active: playlists no eliminadas por owner.
    await queryRunner.query(`
      INSERT INTO "usage" ("subject_type", "subject_id", "entitlement_key", "period_key", "consumed")
      SELECT 'USER', p."ownerId", 'playlists.active', 'lifetime', COUNT(*)
      FROM "playlist" p
      WHERE p."ownerId" IS NOT NULL AND p."deleted_at" IS NULL
      GROUP BY p."ownerId"
      ON CONFLICT ("subject_type", "subject_id", "entitlement_key", "period_key")
      DO UPDATE SET "consumed" = EXCLUDED."consumed", "updated_at" = now()
    `);

    //    collaborators.active: colaboradores de las playlists no eliminadas de cada owner.
    await queryRunner.query(`
      INSERT INTO "usage" ("subject_type", "subject_id", "entitlement_key", "period_key", "consumed")
      SELECT 'USER', p."ownerId", 'collaborators.active', 'lifetime', COUNT(pc."id")
      FROM "playlist_collaborator" pc
      JOIN "playlist" p ON p."id" = pc."playlistId" AND p."deleted_at" IS NULL
      WHERE p."ownerId" IS NOT NULL
      GROUP BY p."ownerId"
      ON CONFLICT ("subject_type", "subject_id", "entitlement_key", "period_key")
      DO UPDATE SET "consumed" = EXCLUDED."consumed", "updated_at" = now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 7/6) usage backfill y plan_entitlements de los entitlements nuevos.
    await queryRunner.query(`
      DELETE FROM "usage" WHERE "entitlement_key" IN ('playlists.active', 'collaborators.active')
    `);
    await queryRunner.query(`
      DELETE FROM "plan_entitlements" WHERE "entitlement_id" IN (
        SELECT "id" FROM "entitlements" WHERE "key" IN ('playlists.active', 'collaborators.active')
      )
    `);

    // 5) role_capabilities de negocio concedidas a los roles PLATFORM.
    const capabilityList = this.platformBusinessCapabilities
      .map((key) => `'${key}'`)
      .join(', ');
    const roleList = this.platformRoleKeys.map((key) => `'${key}'`).join(', ');
    await queryRunner.query(`
      DELETE FROM "role_capabilities"
      WHERE "capability_id" IN (SELECT "id" FROM "capabilities" WHERE "key" IN (${capabilityList}))
        AND "role_id" IN (
          SELECT r."id" FROM "roles" r
          JOIN "tenants" t ON t."id" = r."tenant_id" AND t."slug" = 'musila'
          WHERE r."key" IN (${roleList}) AND r."source" = 'SYSTEM' AND r."type" = 'PLATFORM'
        )
    `);

    // 4) plan_capabilities de las capabilities sembradas aquí.
    await queryRunner.query(`
      DELETE FROM "plan_capabilities" WHERE "capability_id" IN (
        SELECT "id" FROM "capabilities" WHERE "key" IN ('playlist.manage', 'invite.create')
      )
    `);
    await queryRunner.query(`
      DELETE FROM "plan_capabilities" WHERE "capability_id" IN (
        SELECT "id" FROM "capabilities" WHERE "key" IN ('license.view', 'license.manage')
      )
      AND "plan_id" IN (
        SELECT "id" FROM "plans" WHERE "key" IN ('AUTOR_FREE', 'AUTOR_PREMIUM', '360_FREE', '360_PREMIUM')
      )
    `);

    // 3) entitlements nuevos.
    await queryRunner.query(`
      DELETE FROM "entitlements" WHERE "key" IN ('playlists.active', 'collaborators.active')
    `);

    // 2) revertir la ampliación de assignable_to.
    await queryRunner.query(`
      UPDATE "capabilities"
      SET "assignable_to" = array_remove("assignable_to", 'PLATFORM_MEMBER')
      WHERE "key" IN ('license.view', 'license.manage')
    `);

    // 1) capabilities de dominio nuevas.
    await queryRunner.query(`
      DELETE FROM "capabilities" WHERE "key" IN ('playlist.manage', 'invite.create')
    `);
  }
}
