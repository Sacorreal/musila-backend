import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Compatibilidad hacia atrás: mapea el plan denormalizado de `users`
 * (`plan_type` + `plan` + `plan_expires_at`) a una Subscription ACTIVE del
 * plan equivalente. `invitado` y el staff (superadmin/admin) no reciben
 * subscription personal — el staff se autoriza por membership en el tenant
 * MUSILA (migración 1788600000000).
 *
 * Incluye el backfill CRÍTICO de "usage": sin él, los AUTOR_FREE que ya
 * publicaron sus 5 tracks podrían volver a publicar 5 más al activarse el
 * enforcement por entitlements.
 */
export class MigrateUsersToSubscriptions1788500000000 implements MigrationInterface {
  name = 'MigrateUsersToSubscriptions1788500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Un `plan` PRO cuenta como PREMIUM solo si no está vencido; NULL en
    // plan_expires_at = vitalicio (regla legacy del PLAN_DESCUBRIDOR PRO).
    await queryRunner.query(`
      INSERT INTO "subscriptions" ("subject_type", "subject_id", "plan_id", "status", "start_at", "end_at")
      SELECT
        'USER',
        u."id",
        p."id",
        'ACTIVE',
        COALESCE(u."created_at", now()),
        CASE
          WHEN u."plan" = 'pro' AND (u."plan_expires_at" IS NULL OR u."plan_expires_at" > now())
          THEN u."plan_expires_at"
          ELSE NULL
        END
      FROM "users" u
      JOIN "plans" p ON p."key" =
        CASE u."plan_type"
          WHEN 'plan_autor' THEN 'AUTOR'
          WHEN 'plan_360' THEN '360'
          WHEN 'plan_descubridor' THEN 'DESCUBRIDOR'
        END
        ||
        CASE
          WHEN u."plan" = 'pro' AND (u."plan_expires_at" IS NULL OR u."plan_expires_at" > now())
          THEN '_PREMIUM'
          ELSE '_FREE'
        END
      WHERE u."plan_type" IN ('plan_autor', 'plan_360', 'plan_descubridor')
        AND u."deleted_at" IS NULL
      ON CONFLICT ("subject_type", "subject_id") WHERE "status" = 'ACTIVE' DO NOTHING
    `);

    // Los guests existentes reciben el plan GUEST (marketplace.search +
    // license.request sin cuota), equivalente data-driven del acceso legacy
    // de INVITADO. subject_id no tiene FK: admite ids de la tabla "guest".
    await queryRunner.query(`
      INSERT INTO "subscriptions" ("subject_type", "subject_id", "plan_id", "status", "start_at")
      SELECT 'USER', g."id", p."id", 'ACTIVE', COALESCE(g."created_at", now())
      FROM "guest" g
      JOIN "plans" p ON p."key" = 'GUEST'
      WHERE g."deleted_at" IS NULL
      ON CONFLICT ("subject_type", "subject_id") WHERE "status" = 'ACTIVE' DO NOTHING
    `);

    // Backfill de tracks.publish (LIFETIME): total de tracks no eliminados
    // donde el usuario figura como autor — misma query que usaba el
    // PlanLimitsGuard legacy (COUNT sobre track.authors).
    await queryRunner.query(`
      INSERT INTO "usage" ("subject_type", "subject_id", "entitlement_key", "period_key", "consumed")
      SELECT 'USER', tau."usersId", 'tracks.publish', 'lifetime', COUNT(*)
      FROM "track_authors_users" tau
      JOIN "track" t ON t."id" = tau."trackId" AND t."deleted_at" IS NULL
      GROUP BY tau."usersId"
      ON CONFLICT ("subject_type", "subject_id", "entitlement_key", "period_key")
      DO UPDATE SET "consumed" = EXCLUDED."consumed", "updated_at" = now()
    `);

    // Backfill de license.request (MONTH): solicitudes creadas en el mes en
    // curso, para que la cuota mensual arranque coherente con la actividad real.
    await queryRunner.query(`
      INSERT INTO "usage" ("subject_type", "subject_id", "entitlement_key", "period_key", "consumed")
      SELECT
        'USER',
        rt."requesterId",
        'license.request',
        to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM'),
        COUNT(*)
      FROM "requested_track" rt
      WHERE rt."requesterId" IS NOT NULL
        AND rt."deleted_at" IS NULL
        AND date_trunc('month', rt."created_at") = date_trunc('month', now() AT TIME ZONE 'UTC')
      GROUP BY rt."requesterId"
      ON CONFLICT ("subject_type", "subject_id", "entitlement_key", "period_key")
      DO UPDATE SET "consumed" = EXCLUDED."consumed", "updated_at" = now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "usage" WHERE "entitlement_key" IN ('tracks.publish', 'license.request')
    `);
    await queryRunner.query(`
      DELETE FROM "subscriptions"
      WHERE "subject_type" = 'USER'
        AND "plan_id" IN (
          SELECT "id" FROM "plans" WHERE "key" IN (
            'AUTOR_FREE', 'AUTOR_PREMIUM', '360_FREE', '360_PREMIUM', 'DESCUBRIDOR_FREE', 'DESCUBRIDOR_PREMIUM'
          )
        )
    `);
  }
}
