import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Siembra el tenant MUSILA (PLATFORM) con su organización y trackspace, los
 * roles SYSTEM de plataforma (§3: SUPER_ADMIN, PLATFORM_ADMIN, SUPPORT,
 * FINANCE, LEGAL, CONTENT_MODERATOR, ANALYST) y los roles SYSTEM del roster
 * (AUTOR, 360, DESCUBRIDOR), que viven en el tenant MUSILA como plantillas
 * compartidas para todas las organizaciones.
 *
 * El mapeo de capabilities de SUPER_ADMIN/PLATFORM_ADMIN/SUPPORT/
 * CONTENT_MODERATOR replica el de los 4 staff_roles actuales (Super Admin,
 * Admin, Soporte, Editor) para que la migración de staff sea 1:1.
 */
export class SeedTenantsSystemRoles1788300000000 implements MigrationInterface {
  name = 'SeedTenantsSystemRoles1788300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Tenant + organización + trackspace de Musila ──────────────────────
    await queryRunner.query(`
      INSERT INTO "tenants" ("type", "slug", "name")
      VALUES ('PLATFORM', 'musila', 'Musila')
      ON CONFLICT ("slug") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "organizations" ("tenant_id", "name", "type", "slug")
      SELECT t."id", 'Musila', 'OTHER', 'musila'
      FROM "tenants" t
      WHERE t."slug" = 'musila'
      ON CONFLICT ("slug") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "trackspaces" ("organization_id", "name", "is_default")
      SELECT o."id", 'Musila', true
      FROM "organizations" o
      WHERE o."slug" = 'musila'
        AND NOT EXISTS (
          SELECT 1 FROM "trackspaces" ts WHERE ts."organization_id" = o."id" AND ts."is_default" = true
        )
    `);

    // ── Roles SYSTEM de plataforma ────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "roles" ("tenant_id", "type", "source", "key", "name", "description")
      SELECT t."id", 'PLATFORM', 'SYSTEM', r.key, r.name, r.description
      FROM "tenants" t,
        (VALUES
          ('SUPER_ADMIN', 'Super Admin', 'Acceso total a todos los módulos y a la gestión del propio sistema de autorización'),
          ('PLATFORM_ADMIN', 'Platform Admin', 'Acceso operativo a todos los módulos, sin poder gestionar roles internos ni el equipo'),
          ('SUPPORT', 'Soporte', 'Atiende chats y solicitudes de usuarios finales'),
          ('FINANCE', 'Finanzas', 'Gestiona pagos, billetera, comisiones y facturación'),
          ('LEGAL', 'Legal', 'Gestiona certificados, evidencias legales y propiedad intelectual'),
          ('CONTENT_MODERATOR', 'Moderación de contenido', 'Gestiona blog, contenido musical y playlists'),
          ('ANALYST', 'Analista', 'Acceso de solo lectura para análisis y reportes')
        ) AS r(key, name, description)
      WHERE t."slug" = 'musila'
      ON CONFLICT ("tenant_id", "name", "type") DO NOTHING
    `);

    // SUPER_ADMIN: todas las capabilities platform.* (sin bypass por código: todo por datos).
    await this.grant(queryRunner, 'SUPER_ADMIN', `c."key" LIKE 'platform.%'`);

    // PLATFORM_ADMIN: como el rol staff Admin — todo salvo gestionar roles internos y equipo.
    await this.grant(
      queryRunner,
      'PLATFORM_ADMIN',
      `c."key" LIKE 'platform.%' AND c."key" NOT IN ('platform.roles.manage', 'platform.staff.manage')`,
    );

    // SUPPORT: réplica del rol staff Soporte.
    await this.grant(
      queryRunner,
      'SUPPORT',
      `c."key" LIKE 'platform.support.%' OR c."key" IN (
        'platform.users.view', 'platform.users.guests.manage', 'platform.users.invites.manage',
        'platform.billing.wallet.view', 'platform.legal.certificates.view', 'platform.audit.view'
      )`,
    );

    // CONTENT_MODERATOR: réplica del rol staff Editor.
    await this.grant(
      queryRunner,
      'CONTENT_MODERATOR',
      `c."key" LIKE 'platform.blog.%' OR c."key" LIKE 'platform.content.%' OR c."key" IN (
        'platform.playlists.view', 'platform.playlists.moderate', 'platform.notifications.broadcast.create'
      )`,
    );

    // FINANCE: módulo billing completo + lectura de usuarios y auditoría.
    await this.grant(
      queryRunner,
      'FINANCE',
      `c."key" LIKE 'platform.billing%' OR c."key" IN ('platform.users.view', 'platform.audit.view')`,
    );

    // LEGAL: módulo legal + propiedad intelectual + auditoría.
    await this.grant(
      queryRunner,
      'LEGAL',
      `c."key" LIKE 'platform.legal.%' OR c."key" IN (
        'platform.content.intellectual-property.manage', 'platform.audit.view'
      )`,
    );

    // ANALYST: solo lectura de toda la plataforma.
    await this.grant(queryRunner, 'ANALYST', `c."key" LIKE 'platform.%' AND c."action" = 'VIEW'`);

    // ── Roles SYSTEM del roster (plantillas compartidas, §3/§5) ───────────
    await queryRunner.query(`
      INSERT INTO "roles" ("tenant_id", "type", "source", "key", "name", "description")
      SELECT t."id", 'ROSTER', 'SYSTEM', r.key, r.name, r.description
      FROM "tenants" t,
        (VALUES
          ('AUTOR', 'AUTOR', 'Compositor: crea, edita y publica obras, y gestiona su catálogo'),
          ('360', '360', 'Perfil completo: publica obras y además busca y solicita licencias'),
          ('DESCUBRIDOR', 'DESCUBRIDOR', 'Intérprete/descubridor: busca obras y solicita licencias')
        ) AS r(key, name, description)
      WHERE t."slug" = 'musila'
      ON CONFLICT ("tenant_id", "name", "type") DO NOTHING
    `);

    // ── Rol SYSTEM de organización (plantilla compartida): admin del workspace ──
    await queryRunner.query(`
      INSERT INTO "roles" ("tenant_id", "type", "source", "key", "name", "description")
      SELECT t."id", 'ORGANIZATION', 'SYSTEM', 'ORGANIZATION_ADMIN', 'Organization Admin',
             'Administra el staff, el roster, los roles y el workspace de la organización'
      FROM "tenants" t
      WHERE t."slug" = 'musila'
      ON CONFLICT ("tenant_id", "name", "type") DO NOTHING
    `);

    await this.grant(
      queryRunner,
      'ORGANIZATION_ADMIN',
      `c."key" IN (
        'organization.members.view', 'organization.members.manage',
        'organization.roles.view', 'organization.roles.manage',
        'organization.settings.manage',
        'roster.view', 'roster.manage',
        'catalog.view', 'catalog.manage',
        'marketplace.search', 'license.request', 'license.view', 'license.manage',
        'campaign.create', 'campaign.view', 'campaign.manage',
        'reports.view', 'finance.view', 'billing.view'
      )`,
      'ORGANIZATION',
    );

    const autorCapabilities = `'track.create', 'track.edit', 'track.publish', 'catalog.view', 'catalog.manage'`;
    const descubridorCapabilities = `'marketplace.search', 'license.request'`;

    await this.grant(queryRunner, 'AUTOR', `c."key" IN (${autorCapabilities})`, 'OWN');
    await this.grant(
      queryRunner,
      '360',
      `c."key" IN (${autorCapabilities}, ${descubridorCapabilities})`,
      'OWN',
    );
    await this.grant(queryRunner, 'DESCUBRIDOR', `c."key" IN (${descubridorCapabilities})`, 'OWN');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "roles"
      WHERE "source" = 'SYSTEM'
        AND "tenant_id" IN (SELECT "id" FROM "tenants" WHERE "slug" = 'musila')
    `);
    await queryRunner.query(`
      DELETE FROM "trackspaces"
      WHERE "organization_id" IN (SELECT "id" FROM "organizations" WHERE "slug" = 'musila')
    `);
    await queryRunner.query(`DELETE FROM "organizations" WHERE "slug" = 'musila'`);
    await queryRunner.query(`DELETE FROM "tenants" WHERE "slug" = 'musila'`);
  }

  /** Asigna al rol SYSTEM (por key) todas las capabilities que cumplan la condición SQL. */
  private async grant(
    queryRunner: QueryRunner,
    roleKey: string,
    capabilityCondition: string,
    scope = 'PLATFORM',
  ): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "role_capabilities" ("role_id", "capability_id", "scope")
      SELECT r."id", c."id", '${scope}'
      FROM "roles" r
      JOIN "tenants" t ON t."id" = r."tenant_id" AND t."slug" = 'musila'
      CROSS JOIN "capabilities" c
      WHERE r."key" = '${roleKey}' AND r."source" = 'SYSTEM' AND (${capabilityCondition})
      ON CONFLICT ("role_id", "capability_id") DO NOTHING
    `);
  }
}
