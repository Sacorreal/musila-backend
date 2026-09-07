import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Modelo multi-tenant del sistema unificado de autorización: tenants,
 * organizaciones B2B, trackspaces (workspaces con branding) y las dos
 * memberships (staff de organización y roster). Los tipos/estados son
 * varchar con enums TS para evitar el dolor de ALTER TYPE de los enums
 * nativos de Postgres (lección aprendida con `UserPlanType`).
 */
export class CreateTenancyTables1787900000000 implements MigrationInterface {
  name = 'CreateTenancyTables1787900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenants" (
        "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type"       character varying(30) NOT NULL,
        "slug"       character varying(100) NOT NULL,
        "name"       character varying(150) NOT NULL,
        "is_active"  boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenants" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tenants_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organizations" (
        "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id"  uuid NOT NULL,
        "name"       character varying(150) NOT NULL,
        "type"       character varying(30) NOT NULL,
        "slug"       character varying(100) NOT NULL,
        "is_active"  boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organizations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_organizations_tenant" UNIQUE ("tenant_id"),
        CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_organizations_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_organizations_type" ON "organizations" ("type")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trackspaces" (
        "id"              uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "name"            character varying(150) NOT NULL,
        "logo_url"        character varying(500),
        "is_default"      boolean NOT NULL DEFAULT false,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "updated_at"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trackspaces" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trackspaces_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_trackspaces_organization" ON "trackspaces" ("organization_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_memberships" (
        "id"              uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "user_id"         uuid NOT NULL,
        "status"          character varying(20) NOT NULL DEFAULT 'INVITED',
        "invited_by"      uuid,
        "joined_at"       timestamptz,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "updated_at"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organization_memberships" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_organization_memberships_org_user" UNIQUE ("organization_id", "user_id"),
        CONSTRAINT "FK_organization_memberships_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_organization_memberships_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_organization_memberships_user" ON "organization_memberships" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_organization_memberships_org_status" ON "organization_memberships" ("organization_id", "status")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roster_memberships" (
        "id"              uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "user_id"         uuid NOT NULL,
        "status"          character varying(20) NOT NULL DEFAULT 'INVITED',
        "invited_by"      uuid,
        "joined_at"       timestamptz,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "updated_at"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roster_memberships" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_roster_memberships_org_user" UNIQUE ("organization_id", "user_id"),
        CONSTRAINT "FK_roster_memberships_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_roster_memberships_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_roster_memberships_user" ON "roster_memberships" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_roster_memberships_org_status" ON "roster_memberships" ("organization_id", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "roster_memberships"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_memberships"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trackspaces"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);
  }
}
