import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Siembra los entitlements del sistema y los 6 planes personales
 * (AUTOR|360|DESCUBRIDOR × FREE|PREMIUM) con sus PlanCapability y
 * PlanEntitlement (§5-§7). Los valores de los límites provienen de
 * `plan-limits.config.ts` (fuente legacy):
 *
 * - tracks.publish: LIFETIME (el sistema legacy contaba el total de tracks).
 * - license.request: MONTH. El límite legacy era de solicitudes PENDIENTES
 *   simultáneas (concurrencia); portarlo a LIFETIME bloquearía de por vida a
 *   usuarios activos. Una cuota mensual renovable es el equivalente más
 *   cercano sin regresión (§17: "según la periodicidad configurada").
 */
export class SeedPersonalPlansEntitlements1788400000000 implements MigrationInterface {
  name = 'SeedPersonalPlansEntitlements1788400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "entitlements" ("key", "name", "type", "default_period", "scope", "description")
      VALUES
        ('tracks.publish', 'Publicación de tracks', 'QUOTA', 'LIFETIME', 'USER', 'Cantidad de obras que el sujeto puede publicar'),
        ('license.request', 'Solicitudes de licencia', 'QUOTA', 'MONTH', 'USER', 'Cantidad de solicitudes de licencia que el sujeto puede crear por período'),
        ('campaign.active', 'Campañas activas', 'COUNT', 'NONE', 'ORGANIZATION', 'Cantidad de campañas activas simultáneas'),
        ('roster.members', 'Miembros del roster', 'LIMIT', 'NONE', 'ORGANIZATION', 'Cantidad máxima de miembros del roster'),
        ('storage.bytes', 'Almacenamiento', 'STORAGE', 'NONE', 'ORGANIZATION', 'Bytes de almacenamiento disponibles'),
        ('private.pitches', 'Pitches privados', 'QUOTA', 'MONTH', 'ORGANIZATION', 'Cantidad de pitches privados por período'),
        ('exports.monthly', 'Exportaciones mensuales', 'QUOTA', 'MONTH', 'USER', 'Cantidad de exportaciones por mes')
      ON CONFLICT ("key") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "plans" ("key", "name", "description", "subject_type", "tier")
      VALUES
        ('AUTOR_FREE', 'Autor Free', 'Plan gratuito para compositores', 'USER', 'FREE'),
        ('AUTOR_PREMIUM', 'Autor Premium', 'Plan premium para compositores', 'USER', 'PREMIUM'),
        ('360_FREE', '360 Free', 'Plan gratuito del perfil 360', 'USER', 'FREE'),
        ('360_PREMIUM', '360 Premium', 'Plan premium del perfil 360', 'USER', 'PREMIUM'),
        ('DESCUBRIDOR_FREE', 'Descubridor Free', 'Plan gratuito para intérpretes/descubridores', 'USER', 'FREE'),
        ('DESCUBRIDOR_PREMIUM', 'Descubridor Premium', 'Plan premium para intérpretes/descubridores', 'USER', 'PREMIUM'),
        ('GUEST', 'Invitado', 'Acceso limitado para invitados por un usuario de la plataforma', 'USER', 'FREE')
      ON CONFLICT ("key") DO NOTHING
    `);

    // Capabilities por plan (§5): FREE y PREMIUM comparten capabilities — el
    // tier solo cambia los entitlements.
    const planCapabilityMap: Array<[plansLike: string, capabilityKeys: string]> = [
      [`'AUTOR_FREE', 'AUTOR_PREMIUM', '360_FREE', '360_PREMIUM'`, `'track.create', 'track.edit', 'track.publish', 'catalog.view', 'catalog.manage'`],
      // GUEST replica el acceso legacy de INVITADO: buscar y solicitar, sin cuota definida.
      [`'360_FREE', '360_PREMIUM', 'DESCUBRIDOR_FREE', 'DESCUBRIDOR_PREMIUM', 'GUEST'`, `'marketplace.search', 'license.request'`],
    ];

    for (const [planKeys, capabilityKeys] of planCapabilityMap) {
      await queryRunner.query(`
        INSERT INTO "plan_capabilities" ("plan_id", "capability_id")
        SELECT p."id", c."id"
        FROM "plans" p
        CROSS JOIN "capabilities" c
        WHERE p."key" IN (${planKeys}) AND c."key" IN (${capabilityKeys})
        ON CONFLICT ("plan_id", "capability_id") DO NOTHING
      `);
    }

    // Entitlements por plan, con los valores de plan-limits.config.ts.
    await queryRunner.query(`
      INSERT INTO "plan_entitlements" ("plan_id", "entitlement_id", "limit", "unlimited", "period")
      SELECT p."id", e."id", v."limit", v.unlimited, v.period
      FROM (VALUES
        ('AUTOR_FREE',          'tracks.publish',  5,    false, 'LIFETIME'),
        ('AUTOR_PREMIUM',       'tracks.publish',  NULL, true,  'LIFETIME'),
        ('360_FREE',            'tracks.publish',  5,    false, 'LIFETIME'),
        ('360_PREMIUM',         'tracks.publish',  NULL, true,  'LIFETIME'),
        ('360_FREE',            'license.request', 3,    false, 'MONTH'),
        ('360_PREMIUM',         'license.request', NULL, true,  'MONTH'),
        ('DESCUBRIDOR_FREE',    'license.request', 5,    false, 'MONTH'),
        ('DESCUBRIDOR_PREMIUM', 'license.request', NULL, true,  'MONTH')
      ) AS v(plan_key, entitlement_key, "limit", unlimited, period)
      JOIN "plans" p ON p."key" = v.plan_key
      JOIN "entitlements" e ON e."key" = v.entitlement_key
      ON CONFLICT ("plan_id", "entitlement_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "plans" WHERE "key" IN (
        'AUTOR_FREE', 'AUTOR_PREMIUM', '360_FREE', '360_PREMIUM', 'DESCUBRIDOR_FREE', 'DESCUBRIDOR_PREMIUM', 'GUEST'
      )
    `);
    await queryRunner.query(`
      DELETE FROM "entitlements" WHERE "key" IN (
        'tracks.publish', 'license.request', 'campaign.active', 'roster.members',
        'storage.bytes', 'private.pitches', 'exports.monthly'
      )
    `);
  }
}
