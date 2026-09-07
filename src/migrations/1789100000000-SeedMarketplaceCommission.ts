import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Siembra el mecanismo de comisión transaccional del comprador (§2-§5):
 *
 * 1) Entitlement `marketplace.transaction_fee` (PERCENTAGE, scope ORGANIZATION,
 *    aplica solo a LABEL/MANAGEMENT).
 * 2) Capabilities `marketplace.purchase` (¿puede comprar?) y
 *    `platform.plans.manage` (admin de planes/tarifas).
 * 3) Planes de organización SCOUT_* (subject_type ORGANIZATION).
 * 4) `marketplace.purchase` en todos los planes SCOUT_*.
 * 5) Configuración INICIAL de tarifas (§4): 12/8/5/3 % para FREE/START/PRO/
 *    ENTERPRISE, por cada tipo (LABEL, MANAGEMENT). Son datos configurables,
 *    no constantes de código: el Admin puede modificarlos sin desplegar.
 */
export class SeedMarketplaceCommission1789100000000 implements MigrationInterface {
  name = 'SeedMarketplaceCommission1789100000000';

  private readonly scoutPlans: Array<[key: string, name: string, tier: string]> = [
    ['SCOUT_FREE', 'Scout Free', 'FREE'],
    ['SCOUT_START', 'Scout Start', 'PREMIUM'],
    ['SCOUT_PRO', 'Scout Pro', 'PREMIUM'],
    ['SCOUT_ENTERPRISE', 'Scout Enterprise', 'CUSTOM'],
  ];

  /** [planKey, rate] — misma tarifa inicial para LABEL y MANAGEMENT (§4/§6). */
  private readonly initialRates: Array<[planKey: string, rate: number]> = [
    ['SCOUT_FREE', 12],
    ['SCOUT_START', 8],
    ['SCOUT_PRO', 5],
    ['SCOUT_ENTERPRISE', 3],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Entitlement marketplace.transaction_fee.
    await queryRunner.query(`
      INSERT INTO "entitlements"
        ("key", "name", "type", "default_period", "scope", "description", "applies_to_organization_types", "is_active")
      VALUES
        ('marketplace.transaction_fee', 'Comisión transaccional del comprador', 'PERCENTAGE', 'NONE', 'ORGANIZATION',
         'Porcentaje que Musila cobra al comprador sobre el valor de la licencia, según su plan',
         '["LABEL","MANAGEMENT"]'::jsonb, true)
      ON CONFLICT ("key") DO NOTHING
    `);

    // 2) Capabilities.
    await queryRunner.query(`
      INSERT INTO "capabilities"
        ("key", "name", "description", "domain", "resource", "action", "assignable_to", "allowed_scopes", "organization_types", "is_system", "is_active", "version")
      VALUES
        ('marketplace.purchase', 'Comprar en el marketplace', 'Adquirir licencias comerciales de obras en el marketplace', 'MARKETPLACE', 'marketplace', 'OTHER',
         ARRAY['ORGANIZATION_MEMBER','ROSTER_MEMBER']::text[], ARRAY['ORGANIZATION']::text[], ARRAY['LABEL','MANAGEMENT']::text[], true, true, 1),
        ('platform.plans.manage', 'Gestionar planes y tarifas', 'Administrar planes comerciales y la comisión transaccional del marketplace', 'PLATFORM', 'plans', 'MANAGE',
         ARRAY['PLATFORM_MEMBER']::text[], ARRAY['PLATFORM']::text[], '{}'::text[], true, true, 1)
      ON CONFLICT ("key") DO NOTHING
    `);

    // 3) Planes de organización SCOUT_*.
    const planValues = this.scoutPlans
      .map(([key, name, tier]) => `('${key}', '${name}', 'Plan de organización compradora', 'ORGANIZATION', '${tier}')`)
      .join(',\n        ');
    await queryRunner.query(`
      INSERT INTO "plans" ("key", "name", "description", "subject_type", "tier")
      VALUES
        ${planValues}
      ON CONFLICT ("key") DO NOTHING
    `);

    // 4) marketplace.purchase en todos los planes SCOUT_*.
    const scoutKeys = this.scoutPlans.map(([key]) => `'${key}'`).join(', ');
    await queryRunner.query(`
      INSERT INTO "plan_capabilities" ("plan_id", "capability_id")
      SELECT p."id", c."id"
      FROM "plans" p
      CROSS JOIN "capabilities" c
      WHERE p."key" IN (${scoutKeys}) AND c."key" = 'marketplace.purchase'
      ON CONFLICT ("plan_id", "capability_id") DO NOTHING
    `);

    // 5) Tarifas iniciales por (plan, tipo de organización).
    const feeRows = this.initialRates
      .flatMap(([planKey, rate]) => [
        `('${planKey}', 'LABEL', ${rate})`,
        `('${planKey}', 'MANAGEMENT', ${rate})`,
      ])
      .join(',\n        ');

    await queryRunner.query(`
      INSERT INTO "transaction_fee_config"
        ("plan_id", "entitlement_id", "organization_type", "rate", "currency", "is_active", "effective_from")
      SELECT p."id", e."id", v.organization_type, v.rate, 'COP', true, now()
      FROM (VALUES
        ${feeRows}
      ) AS v(plan_key, organization_type, rate)
      JOIN "plans" p ON p."key" = v.plan_key
      JOIN "entitlements" e ON e."key" = 'marketplace.transaction_fee'
      WHERE NOT EXISTS (
        SELECT 1 FROM "transaction_fee_config" t
        WHERE t."plan_id" = p."id"
          AND t."organization_type" = v.organization_type
          AND t."is_active" = true
          AND t."effective_until" IS NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "transaction_fee_config"
      WHERE "plan_id" IN (SELECT "id" FROM "plans" WHERE "key" IN ('SCOUT_FREE','SCOUT_START','SCOUT_PRO','SCOUT_ENTERPRISE'))
    `);
    await queryRunner.query(`
      DELETE FROM "plan_capabilities"
      WHERE "plan_id" IN (SELECT "id" FROM "plans" WHERE "key" IN ('SCOUT_FREE','SCOUT_START','SCOUT_PRO','SCOUT_ENTERPRISE'))
    `);
    await queryRunner.query(
      `DELETE FROM "plans" WHERE "key" IN ('SCOUT_FREE','SCOUT_START','SCOUT_PRO','SCOUT_ENTERPRISE')`,
    );
    await queryRunner.query(
      `DELETE FROM "capabilities" WHERE "key" IN ('marketplace.purchase', 'platform.plans.manage')`,
    );
    await queryRunner.query(
      `DELETE FROM "entitlements" WHERE "key" = 'marketplace.transaction_fee'`,
    );
  }
}
