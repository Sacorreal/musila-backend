import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración de datos (100% aditiva, no toca ninguna fila de `users`):
 * 1) siembra el catálogo de 55 permisos granulares, 2) siembra los 4 roles
 * base (Super Admin, Admin, Editor, Soporte) con sus permisos, y 3) hace
 * backfill de `staff_user_roles` para los usuarios que hoy tienen
 * `plan_type` superadmin/admin (columna física confirmada en
 * `user.entity.ts`), para que el sistema de roles internos funcione desde
 * el día uno sin requerir asignación manual.
 */
export class SeedStaffRolesAndPermissions1786900000000
  implements MigrationInterface
{
  name = 'SeedStaffRolesAndPermissions1786900000000';

  private readonly permissions: Array<[string, string, string]> = [
    // [code, module, description]
    ['blog:articles:view', 'blog', 'Ver artículos del blog'],
    ['blog:articles:create', 'blog', 'Crear artículos del blog'],
    ['blog:articles:edit', 'blog', 'Editar artículos del blog'],
    ['blog:articles:publish', 'blog', 'Publicar artículos del blog'],
    ['blog:articles:delete', 'blog', 'Eliminar artículos del blog'],
    ['blog:authors:manage', 'blog', 'Gestionar autores del blog'],
    ['blog:tags:manage', 'blog', 'Gestionar etiquetas del blog'],

    ['content:tracks:view', 'content', 'Ver canciones'],
    ['content:tracks:edit', 'content', 'Editar canciones'],
    ['content:tracks:delete', 'content', 'Eliminar canciones'],
    ['content:tracks:approve', 'content', 'Aprobar canciones'],
    ['content:genres:manage', 'content', 'Gestionar géneros musicales'],
    ['content:moods:manage', 'content', 'Gestionar estados de ánimo'],
    ['content:themes:manage', 'content', 'Gestionar temas musicales'],
    ['content:intellectual-property:manage', 'content', 'Gestionar propiedad intelectual'],

    ['playlists:view', 'playlists', 'Ver playlists'],
    ['playlists:moderate', 'playlists', 'Moderar playlists'],
    ['playlists:collaborators:manage', 'playlists', 'Gestionar colaboradores de playlists'],

    ['users:view', 'users', 'Ver usuarios'],
    ['users:edit', 'users', 'Editar usuarios'],
    ['users:suspend', 'users', 'Suspender usuarios'],
    ['users:delete', 'users', 'Eliminar usuarios'],
    ['users:guests:manage', 'users', 'Gestionar invitados'],
    ['users:invites:manage', 'users', 'Gestionar invitaciones'],
    ['users:follows:moderate', 'users', 'Moderar relaciones de seguimiento'],

    ['support:chats:view', 'support', 'Ver chats de soporte'],
    ['support:chats:respond', 'support', 'Responder chats de soporte'],
    ['support:chats:close', 'support', 'Cerrar chats de soporte'],
    ['support:requests:view', 'support', 'Ver solicitudes de uso de pistas'],
    ['support:requests:manage', 'support', 'Gestionar solicitudes de uso de pistas'],
    ['support:sharing:manage', 'support', 'Gestionar enlaces para compartir'],

    ['billing:payments:view', 'billing', 'Ver pagos'],
    ['billing:payments:refund', 'billing', 'Reembolsar pagos'],
    ['billing:payment-sources:manage', 'billing', 'Gestionar fuentes de pago'],
    ['billing:wallet:view', 'billing', 'Ver billetera'],
    ['billing:wallet:approve-withdrawal', 'billing', 'Aprobar retiros de billetera'],
    ['billing:affiliates:manage', 'billing', 'Gestionar afiliados'],
    ['billing:commissions:manage', 'billing', 'Gestionar comisiones'],
    ['billing:license-collections:manage', 'billing', 'Gestionar cobros de licencias'],
    ['billing:license-contracts:manage', 'billing', 'Gestionar contratos de licencia'],
    ['billing:splits:manage', 'billing', 'Gestionar splits de autoría'],

    ['legal:certificates:view', 'legal', 'Ver certificados de autoría'],
    ['legal:certificates:reissue', 'legal', 'Reemitir certificados de autoría'],
    ['legal:proofs:view', 'legal', 'Ver evidencias legales'],

    ['notifications:broadcast:create', 'notifications', 'Crear notificaciones masivas'],
    ['notifications:broadcast:manage', 'notifications', 'Gestionar notificaciones masivas'],

    ['system:settings:view', 'system', 'Ver configuración del sistema'],
    ['system:settings:manage', 'system', 'Gestionar configuración del sistema'],
    ['system:plan-limits:manage', 'system', 'Gestionar límites de plan'],
    ['system:roles:view', 'system', 'Ver roles internos'],
    ['system:roles:manage', 'system', 'Gestionar roles internos'],
    ['system:staff:view', 'system', 'Ver miembros del equipo'],
    ['system:staff:manage', 'system', 'Gestionar miembros del equipo'],

    ['audit:view', 'audit', 'Ver registro de auditoría de staff'],
    ['audit:export', 'audit', 'Exportar registro de auditoría de staff'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const values = this.permissions
      .map(([code, module, description]) => {
        const escapedDescription = description.replace(/'/g, "''");
        return `('${code}', '${module}', '${escapedDescription}')`;
      })
      .join(',\n        ');

    await queryRunner.query(`
      INSERT INTO "staff_permissions" ("code", "module", "description")
      VALUES
        ${values}
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "staff_roles" ("name", "slug", "description", "is_system")
      VALUES
        ('Super Admin', 'super-admin', 'Acceso total a todos los módulos y a la gestión del propio sistema de roles', true),
        ('Admin', 'admin', 'Acceso operativo a todos los módulos, sin poder gestionar roles ni el equipo interno', true),
        ('Editor', 'editor', 'Gestiona blog, contenido musical y playlists', true),
        ('Soporte', 'soporte', 'Atiende chats y solicitudes de usuarios finales', true)
      ON CONFLICT ("slug") DO NOTHING
    `);

    // Super Admin: todos los permisos.
    await queryRunner.query(`
      INSERT INTO "staff_role_permissions" ("staff_role_id", "staff_permission_id")
      SELECT r."id", p."id"
      FROM "staff_roles" r, "staff_permissions" p
      WHERE r."slug" = 'super-admin'
      ON CONFLICT DO NOTHING
    `);

    // Admin: todos los permisos, salvo gestionar roles internos y el equipo (reservado a Super Admin).
    await queryRunner.query(`
      INSERT INTO "staff_role_permissions" ("staff_role_id", "staff_permission_id")
      SELECT r."id", p."id"
      FROM "staff_roles" r, "staff_permissions" p
      WHERE r."slug" = 'admin'
        AND p."code" NOT IN ('system:roles:manage', 'system:staff:manage')
      ON CONFLICT DO NOTHING
    `);

    // Editor: blog, contenido musical, moderación de playlists y notificaciones masivas.
    await queryRunner.query(`
      INSERT INTO "staff_role_permissions" ("staff_role_id", "staff_permission_id")
      SELECT r."id", p."id"
      FROM "staff_roles" r, "staff_permissions" p
      WHERE r."slug" = 'editor'
        AND (
          p."module" IN ('blog', 'content')
          OR p."code" IN ('playlists:view', 'playlists:moderate', 'notifications:broadcast:create')
        )
      ON CONFLICT DO NOTHING
    `);

    // Soporte: chats/solicitudes/compartir, más lectura de usuarios, billetera, certificados y auditoría.
    await queryRunner.query(`
      INSERT INTO "staff_role_permissions" ("staff_role_id", "staff_permission_id")
      SELECT r."id", p."id"
      FROM "staff_roles" r, "staff_permissions" p
      WHERE r."slug" = 'soporte'
        AND (
          p."module" = 'support'
          OR p."code" IN (
            'users:view', 'users:guests:manage', 'users:invites:manage',
            'billing:wallet:view', 'legal:certificates:view', 'audit:view'
          )
        )
      ON CONFLICT DO NOTHING
    `);

    // Backfill: usuarios legacy con plan_type superadmin/admin quedan asignados a su rol interno equivalente.
    await queryRunner.query(`
      INSERT INTO "staff_user_roles" ("user_id", "staff_role_id", "assigned_at")
      SELECT u."id", r."id", now()
      FROM "users" u, "staff_roles" r
      WHERE u."plan_type" = 'superadmin' AND r."slug" = 'super-admin'
      ON CONFLICT ("user_id") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "staff_user_roles" ("user_id", "staff_role_id", "assigned_at")
      SELECT u."id", r."id", now()
      FROM "users" u, "staff_roles" r
      WHERE u."plan_type" = 'admin' AND r."slug" = 'admin'
      ON CONFLICT ("user_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "staff_user_roles"
      WHERE "staff_role_id" IN (SELECT "id" FROM "staff_roles" WHERE "slug" IN ('super-admin', 'admin'))
    `);
    await queryRunner.query(`
      DELETE FROM "staff_role_permissions"
      WHERE "staff_role_id" IN (SELECT "id" FROM "staff_roles" WHERE "is_system" = true)
    `);
    await queryRunner.query(`DELETE FROM "staff_roles" WHERE "is_system" = true`);

    const codes = this.permissions.map(([code]) => `'${code}'`).join(', ');
    await queryRunner.query(`DELETE FROM "staff_permissions" WHERE "code" IN (${codes})`);
  }
}
