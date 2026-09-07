import { MigrationInterface, QueryRunner } from 'typeorm';

type CapabilityRow = [
  key: string,
  name: string,
  description: string,
  domain: string,
  resource: string,
  action: string,
  assignableTo: string[],
  allowedScopes: string[],
  organizationTypes: string[],
];

/**
 * Siembra la MATRIZ DE CAPACIDADES (§2 del requerimiento):
 *
 * 1) El catálogo de negocio (capabilities de plataforma, organización,
 *    roster, catálogo, tracks, marketplace, licencias, campañas y reportes).
 * 2) Las capabilities `platform.*` derivadas 1:1 de los permisos de staff
 *    existentes, con la regla mecánica y verificable:
 *    `modulo:recurso:accion` → `platform.<modulo>.<recurso>.<accion>`
 *    (el prefijo `system:` se elimina: `system:roles:manage` →
 *    `platform.roles.manage`). La misma regla se usa en la migración
 *    1788600000000 para portar roles custom de staff.
 *
 * organizationTypes vacío = disponible para todos los tipos de organización.
 */
export class SeedCapabilityCatalog1788200000000 implements MigrationInterface {
  name = 'SeedCapabilityCatalog1788200000000';

  private readonly platformSubject = ['PLATFORM_MEMBER'];
  private readonly orgSubject = ['ORGANIZATION_MEMBER'];
  private readonly rosterSubject = ['ROSTER_MEMBER'];

  private readonly businessCatalog: CapabilityRow[] = [
    // ── Plataforma (staff de Musila) ──────────────────────────────────────
    ['platform.users.view', 'Ver usuarios de la plataforma', 'Consultar los usuarios registrados en Musila', 'PLATFORM', 'users', 'VIEW', this.platformSubject, ['PLATFORM'], []],
    ['platform.users.manage', 'Gestionar usuarios de la plataforma', 'Crear, editar, suspender y eliminar usuarios de Musila', 'PLATFORM', 'users', 'MANAGE', this.platformSubject, ['PLATFORM'], []],
    ['platform.organizations.view', 'Ver organizaciones', 'Consultar las organizaciones B2B (labels, publishers, etc.)', 'PLATFORM', 'organizations', 'VIEW', this.platformSubject, ['PLATFORM'], []],
    ['platform.organizations.manage', 'Gestionar organizaciones', 'Crear y administrar organizaciones B2B, sus workspaces y subscriptions', 'PLATFORM', 'organizations', 'MANAGE', this.platformSubject, ['PLATFORM'], []],
    ['platform.billing.view', 'Ver facturación de la plataforma', 'Consultar pagos, subscriptions y facturación global', 'PLATFORM', 'billing', 'VIEW', this.platformSubject, ['PLATFORM'], []],
    ['platform.billing.manage', 'Gestionar facturación de la plataforma', 'Administrar planes, subscriptions y operaciones de facturación', 'PLATFORM', 'billing', 'MANAGE', this.platformSubject, ['PLATFORM'], []],
    ['platform.audit.view', 'Ver auditoría', 'Consultar el registro de auditoría de la plataforma', 'PLATFORM', 'audit', 'VIEW', this.platformSubject, ['PLATFORM'], []],
    ['platform.settings.manage', 'Gestionar configuración de la plataforma', 'Administrar la configuración global del sistema, el catálogo de capabilities y las políticas', 'PLATFORM', 'settings', 'MANAGE', this.platformSubject, ['PLATFORM'], []],

    // ── Organización (staff B2B) ──────────────────────────────────────────
    ['organization.members.view', 'Ver miembros del staff', 'Consultar los miembros del staff de la organización', 'ORGANIZATION', 'organization_member', 'VIEW', this.orgSubject, ['ORGANIZATION'], []],
    ['organization.members.manage', 'Gestionar miembros del staff', 'Invitar, suspender y retirar miembros del staff, y asignarles roles', 'ORGANIZATION', 'organization_member', 'MANAGE', this.orgSubject, ['ORGANIZATION'], []],
    ['organization.roles.view', 'Ver roles de la organización', 'Consultar los roles propios y del sistema disponibles en la organización', 'ORGANIZATION', 'role', 'VIEW', this.orgSubject, ['ORGANIZATION'], []],
    ['organization.roles.manage', 'Gestionar roles de la organización', 'Crear, editar y eliminar roles custom seleccionando capabilities del catálogo', 'ORGANIZATION', 'role', 'MANAGE', this.orgSubject, ['ORGANIZATION'], []],
    ['organization.settings.manage', 'Gestionar workspace', 'Personalizar el nombre y el logo del workspace de la organización', 'ORGANIZATION', 'workspace', 'MANAGE', this.orgSubject, ['ORGANIZATION'], []],

    // ── Roster ────────────────────────────────────────────────────────────
    ['roster.view', 'Ver roster', 'Consultar los artistas y compositores administrados por la organización', 'ROSTER', 'roster_member', 'VIEW', this.orgSubject, ['ORGANIZATION', 'ASSIGNED'], []],
    ['roster.manage', 'Gestionar roster', 'Invitar, suspender y retirar miembros del roster, y asignarles roles', 'ROSTER', 'roster_member', 'MANAGE', this.orgSubject, ['ORGANIZATION'], []],

    // ── Catálogo musical ──────────────────────────────────────────────────
    ['catalog.view', 'Ver catálogo', 'Consultar el catálogo de obras', 'CATALOG', 'catalog', 'VIEW', ['ORGANIZATION_MEMBER', 'ROSTER_MEMBER', 'PLATFORM_MEMBER'], ['OWN', 'ASSIGNED', 'ORGANIZATION'], []],
    ['catalog.manage', 'Gestionar catálogo', 'Administrar las obras del catálogo', 'CATALOG', 'catalog', 'MANAGE', ['ORGANIZATION_MEMBER', 'ROSTER_MEMBER', 'PLATFORM_MEMBER'], ['OWN', 'ASSIGNED', 'ORGANIZATION'], []],

    // ── Tracks ────────────────────────────────────────────────────────────
    ['track.create', 'Crear tracks', 'Subir nuevas obras al sistema', 'TRACK', 'track', 'CREATE', ['ROSTER_MEMBER', 'PLATFORM_MEMBER'], ['OWN', 'ORGANIZATION'], []],
    ['track.edit', 'Editar tracks', 'Modificar obras existentes', 'TRACK', 'track', 'EDIT', ['ROSTER_MEMBER', 'PLATFORM_MEMBER'], ['OWN', 'ORGANIZATION'], []],
    ['track.publish', 'Publicar tracks', 'Publicar obras para su licenciamiento', 'TRACK', 'track', 'PUBLISH', ['ROSTER_MEMBER', 'PLATFORM_MEMBER'], ['OWN', 'ORGANIZATION'], []],

    // ── Marketplace y licencias ───────────────────────────────────────────
    ['marketplace.search', 'Buscar en el marketplace', 'Buscar obras disponibles para licenciamiento', 'MARKETPLACE', 'marketplace', 'OTHER', ['ORGANIZATION_MEMBER', 'ROSTER_MEMBER'], ['OWN', 'ORGANIZATION'], []],
    ['license.request', 'Solicitar licencias', 'Solicitar derechos de uso comercial de una obra', 'LICENSE', 'license', 'REQUEST', ['ORGANIZATION_MEMBER', 'ROSTER_MEMBER'], ['OWN', 'ORGANIZATION'], []],
    ['license.view', 'Ver licencias', 'Consultar solicitudes y contratos de licencia', 'LICENSE', 'license', 'VIEW', ['ORGANIZATION_MEMBER', 'ROSTER_MEMBER'], ['OWN', 'ORGANIZATION'], []],
    ['license.manage', 'Gestionar licencias', 'Administrar solicitudes y contratos de licencia', 'LICENSE', 'license', 'MANAGE', this.orgSubject, ['ORGANIZATION'], []],

    // ── Campañas ──────────────────────────────────────────────────────────
    ['campaign.create', 'Crear campañas', 'Crear campañas de promoción', 'CAMPAIGN', 'campaign', 'CREATE', this.orgSubject, ['ORGANIZATION', 'ASSIGNED'], []],
    ['campaign.view', 'Ver campañas', 'Consultar campañas de promoción', 'CAMPAIGN', 'campaign', 'VIEW', this.orgSubject, ['ORGANIZATION', 'ASSIGNED'], []],
    ['campaign.manage', 'Gestionar campañas', 'Administrar campañas de promoción', 'CAMPAIGN', 'campaign', 'MANAGE', this.orgSubject, ['ORGANIZATION'], []],

    // ── Reportes y finanzas ───────────────────────────────────────────────
    ['reports.view', 'Ver reportes', 'Consultar reportes de actividad y desempeño', 'REPORTS', 'report', 'VIEW', this.orgSubject, ['ORGANIZATION'], ['LABEL', 'PUBLISHER']],
    ['finance.view', 'Ver finanzas', 'Consultar la información financiera de la organización', 'FINANCE', 'finance', 'VIEW', this.orgSubject, ['ORGANIZATION'], []],
    ['billing.view', 'Ver facturación', 'Consultar la subscription y la facturación de la organización', 'BILLING', 'billing', 'VIEW', this.orgSubject, ['ORGANIZATION'], []],
  ];

  /** Copia literal del catálogo de staff_permissions sembrado en 1786900000000 (fuente del mapping 1:1). */
  private readonly staffPermissions: Array<[string, string, string]> = [
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

  /** Regla mecánica compartida con 1788600000000: staff code → capability key. */
  static staffCodeToCapabilityKey(code: string): string {
    const withoutSystemPrefix = code.startsWith('system:') ? code.slice('system:'.length) : code;
    return `platform.${withoutSystemPrefix.replace(/:/g, '.')}`;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const platformRows: CapabilityRow[] = this.staffPermissions.map(([code, module, description]) => {
      const key = SeedCapabilityCatalog1788200000000.staffCodeToCapabilityKey(code);
      const segments = code.split(':');
      const action = this.toAction(segments[segments.length - 1]);
      const resource = segments.length > 2 ? segments[1] : segments[0];
      return [
        key,
        description,
        `${description} (portado del permiso de staff '${code}')`,
        module.toUpperCase(),
        resource,
        action,
        this.platformSubject,
        ['PLATFORM'],
        [],
      ];
    });

    // El catálogo de negocio va primero: en las keys que colisionan
    // (platform.users.view, platform.audit.view, platform.settings.manage)
    // prevalece su definición y el ON CONFLICT descarta la derivada.
    const rows = [...this.businessCatalog, ...platformRows];

    const values = rows
      .map((row) => {
        const [key, name, description, domain, resource, action, assignableTo, allowedScopes, organizationTypes] = row;
        return `('${key}', '${this.escape(name)}', '${this.escape(description)}', '${domain}', '${resource}', '${action}', ${this.toArrayLiteral(assignableTo)}, ${this.toArrayLiteral(allowedScopes)}, ${this.toArrayLiteral(organizationTypes)}, true, true, 1)`;
      })
      .join(',\n        ');

    await queryRunner.query(`
      INSERT INTO "capabilities"
        ("key", "name", "description", "domain", "resource", "action", "assignable_to", "allowed_scopes", "organization_types", "is_system", "is_active", "version")
      VALUES
        ${values}
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const keys = [
      ...this.businessCatalog.map(([key]) => key),
      ...this.staffPermissions.map(([code]) =>
        SeedCapabilityCatalog1788200000000.staffCodeToCapabilityKey(code),
      ),
    ];
    const list = [...new Set(keys)].map((key) => `'${key}'`).join(', ');
    await queryRunner.query(`DELETE FROM "capabilities" WHERE "key" IN (${list})`);
  }

  private toAction(lastSegment: string): string {
    switch (lastSegment) {
      case 'view': return 'VIEW';
      case 'create': return 'CREATE';
      case 'edit': return 'EDIT';
      case 'delete': return 'DELETE';
      case 'manage': return 'MANAGE';
      case 'publish': return 'PUBLISH';
      case 'approve': return 'APPROVE';
      case 'export': return 'EXPORT';
      default: return 'OTHER';
    }
  }

  private toArrayLiteral(values: string[]): string {
    if (values.length === 0) return `'{}'::text[]`;
    return `ARRAY[${values.map((value) => `'${value}'`).join(', ')}]::text[]`;
  }

  private escape(value: string): string {
    return value.replace(/'/g, "''");
  }
}
