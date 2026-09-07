import { SeedCapabilityCatalog1788200000000 } from '../migrations/1788200000000-SeedCapabilityCatalog';

/**
 * Spec de equivalencia staff ↔ platform (riesgo #4 del plan): la regla
 * mecánica `modulo:recurso:accion` → `platform.<...>` debe ser 1:1 y estable,
 * porque la usan el seed del catálogo y la migración de roles custom de staff.
 */
describe('Mapping staff permission → platform capability', () => {
  const toKey = (code: string) =>
    SeedCapabilityCatalog1788200000000.staffCodeToCapabilityKey(code);

  it('mapea códigos regulares módulo:recurso:acción', () => {
    expect(toKey('blog:articles:publish')).toBe('platform.blog.articles.publish');
    expect(toKey('users:view')).toBe('platform.users.view');
    expect(toKey('audit:export')).toBe('platform.audit.export');
  });

  it('elimina el prefijo system: (alinea con las keys del documento, ej. platform.settings.manage)', () => {
    expect(toKey('system:settings:manage')).toBe('platform.settings.manage');
    expect(toKey('system:roles:manage')).toBe('platform.roles.manage');
    expect(toKey('system:plan-limits:manage')).toBe('platform.plan-limits.manage');
    expect(toKey('system:staff:view')).toBe('platform.staff.view');
  });

  it('es inyectiva sobre los 55 códigos sembrados (ninguna colisión entre permisos staff)', () => {
    const seed = new SeedCapabilityCatalog1788200000000();
    const codes = (seed as unknown as { staffPermissions: Array<[string, string, string]> })
      .staffPermissions;

    expect(codes).toHaveLength(55);

    const keys = codes.map(([code]) => toKey(code));
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(key).toMatch(/^platform\.[a-z0-9.-]+$/);
    }
  });
});
