import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Otorga `campaign.create`/`campaign.view`/`campaign.manage` (ya definidas en
 * el catálogo desde `1788200000000-SeedCapabilityCatalog`, con
 * `organization_types` vacío = disponibles para cualquier tipo de
 * organización, y ya concedidas al rol SYSTEM `ORGANIZATION_ADMIN` en
 * `1788300000000-SeedTenantsSystemRoles`) también a los planes personales que
 * ya pueden buscar canciones en el marketplace (`marketplace.search` +
 * `license.request`, otorgadas en `1788400000000-SeedPersonalPlansEntitlements`):
 * cualquier usuario que puede buscar/licenciar, no solo organizaciones tipo
 * LABEL, puede ahora crear y gestionar sus propias campañas (sin
 * organización asociada).
 */
export class SeedPersonalPlansCampaignCapability1792200000000 implements MigrationInterface {
  name = 'SeedPersonalPlansCampaignCapability1792200000000';

  private readonly planKeys = `'360_FREE', '360_PREMIUM', 'DESCUBRIDOR_FREE', 'DESCUBRIDOR_PREMIUM', 'GUEST'`;
  private readonly capabilityKeys = `'campaign.create', 'campaign.view', 'campaign.manage'`;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "plan_capabilities" ("plan_id", "capability_id")
      SELECT p."id", c."id"
      FROM "plans" p
      CROSS JOIN "capabilities" c
      WHERE p."key" IN (${this.planKeys}) AND c."key" IN (${this.capabilityKeys})
      ON CONFLICT ("plan_id", "capability_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "plan_capabilities"
      WHERE "capability_id" IN (SELECT "id" FROM "capabilities" WHERE "key" IN (${this.capabilityKeys}))
        AND "plan_id" IN (SELECT "id" FROM "plans" WHERE "key" IN (${this.planKeys}))
    `);
  }
}
