import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Catálogo global de capabilities (MATRIZ DE CAPACIDADES), roles
 * tenant-aware y asignaciones rol↔membership. `membership_roles` referencia
 * memberships por (membership_type, membership_id) — FK lógica, sin
 * constraint física, porque apunta a dos tablas distintas.
 */
export class CreateAuthorizationTables1788000000000 implements MigrationInterface {
  name = 'CreateAuthorizationTables1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "capabilities" (
        "id"                 uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key"                character varying(120) NOT NULL,
        "name"               character varying(150) NOT NULL,
        "description"        character varying(500) NOT NULL,
        "domain"             character varying(50) NOT NULL,
        "resource"           character varying(80) NOT NULL,
        "action"             character varying(20) NOT NULL,
        "assignable_to"      text[] NOT NULL DEFAULT '{}',
        "allowed_scopes"     text[] NOT NULL DEFAULT '{}',
        "organization_types" text[] NOT NULL DEFAULT '{}',
        "is_system"          boolean NOT NULL DEFAULT true,
        "is_active"          boolean NOT NULL DEFAULT true,
        "version"            integer NOT NULL DEFAULT 1,
        "created_at"         timestamptz NOT NULL DEFAULT now(),
        "updated_at"         timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_capabilities" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_capabilities_key" UNIQUE ("key")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_capabilities_domain" ON "capabilities" ("domain")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id"   uuid NOT NULL,
        "type"        character varying(20) NOT NULL,
        "source"      character varying(20) NOT NULL DEFAULT 'CUSTOM',
        "key"         character varying(60),
        "name"        character varying(100) NOT NULL,
        "description" text,
        "is_active"   boolean NOT NULL DEFAULT true,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        "updated_at"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_roles_tenant_name_type" UNIQUE ("tenant_id", "name", "type"),
        CONSTRAINT "FK_roles_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_roles_tenant_type" ON "roles" ("tenant_id", "type")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_capabilities" (
        "id"            uuid NOT NULL DEFAULT uuid_generate_v4(),
        "role_id"       uuid NOT NULL,
        "capability_id" uuid NOT NULL,
        "scope"         character varying(20) NOT NULL,
        "created_at"    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_role_capabilities" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_role_capabilities_role_capability" UNIQUE ("role_id", "capability_id"),
        CONSTRAINT "FK_role_capabilities_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_role_capabilities_capability" FOREIGN KEY ("capability_id") REFERENCES "capabilities"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_role_capabilities_capability" ON "role_capabilities" ("capability_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "membership_roles" (
        "id"              uuid NOT NULL DEFAULT uuid_generate_v4(),
        "membership_type" character varying(20) NOT NULL,
        "membership_id"   uuid NOT NULL,
        "role_id"         uuid NOT NULL,
        "assigned_by"     uuid,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_membership_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_membership_roles_membership_role" UNIQUE ("membership_type", "membership_id", "role_id"),
        CONSTRAINT "FK_membership_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_membership_roles_membership" ON "membership_roles" ("membership_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "membership_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_capabilities"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "capabilities"`);
  }
}
