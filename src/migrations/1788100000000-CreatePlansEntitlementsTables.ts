import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Modelo comercial: planes, entitlements, subscriptions y usage. El índice
 * único parcial de subscriptions garantiza una única suscripción ACTIVE por
 * sujeto; el unique compuesto de "usage" soporta el upsert atómico de
 * consumo (INSERT ... ON CONFLICT DO UPDATE ... WHERE).
 */
export class CreatePlansEntitlementsTables1788100000000 implements MigrationInterface {
  name = 'CreatePlansEntitlementsTables1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "plans" (
        "id"           uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key"          character varying(80) NOT NULL,
        "name"         character varying(150) NOT NULL,
        "description"  text,
        "subject_type" character varying(20) NOT NULL,
        "tier"         character varying(20) NOT NULL,
        "is_active"    boolean NOT NULL DEFAULT true,
        "created_at"   timestamptz NOT NULL DEFAULT now(),
        "updated_at"   timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plans" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_plans_key" UNIQUE ("key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "entitlements" (
        "id"             uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key"            character varying(120) NOT NULL,
        "name"           character varying(150) NOT NULL,
        "type"           character varying(20) NOT NULL,
        "default_period" character varying(20) NOT NULL DEFAULT 'NONE',
        "scope"          character varying(20) NOT NULL,
        "description"    text,
        "created_at"     timestamptz NOT NULL DEFAULT now(),
        "updated_at"     timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_entitlements" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_entitlements_key" UNIQUE ("key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "plan_capabilities" (
        "id"            uuid NOT NULL DEFAULT uuid_generate_v4(),
        "plan_id"       uuid NOT NULL,
        "capability_id" uuid NOT NULL,
        "created_at"    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plan_capabilities" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_plan_capabilities_plan_capability" UNIQUE ("plan_id", "capability_id"),
        CONSTRAINT "FK_plan_capabilities_plan" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_plan_capabilities_capability" FOREIGN KEY ("capability_id") REFERENCES "capabilities"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "plan_entitlements" (
        "id"             uuid NOT NULL DEFAULT uuid_generate_v4(),
        "plan_id"        uuid NOT NULL,
        "entitlement_id" uuid NOT NULL,
        "limit"          integer,
        "unlimited"      boolean NOT NULL DEFAULT false,
        "period"         character varying(20) NOT NULL,
        "created_at"     timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plan_entitlements" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_plan_entitlements_plan_entitlement" UNIQUE ("plan_id", "entitlement_id"),
        CONSTRAINT "FK_plan_entitlements_plan" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_plan_entitlements_entitlement" FOREIGN KEY ("entitlement_id") REFERENCES "entitlements"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscriptions" (
        "id"                uuid NOT NULL DEFAULT uuid_generate_v4(),
        "subject_type"      character varying(20) NOT NULL,
        "subject_id"        uuid NOT NULL,
        "plan_id"           uuid NOT NULL,
        "status"            character varying(20) NOT NULL DEFAULT 'ACTIVE',
        "start_at"          timestamptz NOT NULL,
        "end_at"            timestamptz,
        "billing_provider"  character varying(40),
        "billing_reference" character varying(255),
        "created_at"        timestamptz NOT NULL DEFAULT now(),
        "updated_at"        timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_subscriptions_plan" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_subscriptions_subject_status" ON "subscriptions" ("subject_type", "subject_id", "status")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_subscriptions_subject_active" ON "subscriptions" ("subject_type", "subject_id") WHERE "status" = 'ACTIVE'`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "usage" (
        "id"              uuid NOT NULL DEFAULT uuid_generate_v4(),
        "subject_type"    character varying(20) NOT NULL,
        "subject_id"      uuid NOT NULL,
        "entitlement_key" character varying(120) NOT NULL,
        "period_key"      character varying(80) NOT NULL,
        "consumed"        integer NOT NULL DEFAULT 0,
        "updated_at"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_usage" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_usage_subject_entitlement_period" UNIQUE ("subject_type", "subject_id", "entitlement_key", "period_key")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "usage"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_subscriptions_subject_active"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "plan_entitlements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "plan_capabilities"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "entitlements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "plans"`);
  }
}
