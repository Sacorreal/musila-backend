import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Módulo de pautas publicitarias (destacados pagados): tabla `promotions` con la
 * máquina de estados y el índice único parcial de idempotencia (impide pautar
 * dos veces el mismo recurso mientras hay una pauta viva), y tabla
 * `promotion_pricing_config` (precio versionado append-only por tipo, gestionado
 * por el superadmin). Incluye el seed de precios iniciales.
 */
export class CreatePromotionsTables1789600000000 implements MigrationInterface {
  name = 'CreatePromotionsTables1789600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "promotions" (
        "id"                    uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type"                  character varying(20) NOT NULL,
        "target_id"             uuid NOT NULL,
        "organization_id"       uuid NOT NULL,
        "requested_by_user_id"  uuid NOT NULL,
        "status"                character varying(30) NOT NULL DEFAULT 'DRAFT',
        "price_amount"          numeric(12,2) NOT NULL DEFAULT 0,
        "currency"              character varying(3) NOT NULL DEFAULT 'COP',
        "payment_status"        character varying(20) NOT NULL DEFAULT 'NONE',
        "payment_reference"     character varying(100),
        "starts_at"             timestamptz,
        "expires_at"            timestamptz,
        "approved_by_user_id"   uuid,
        "approved_at"           timestamptz,
        "rejection_reason"      text,
        "withdrawn_at"          timestamptz,
        "created_at"            timestamptz NOT NULL DEFAULT now(),
        "updated_at"            timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_promotions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_promotion_type_status" ON "promotions" ("type", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_promotion_organization" ON "promotions" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_promotion_target" ON "promotions" ("target_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_promotion_payment_reference" ON "promotions" ("payment_reference")`,
    );

    // Idempotencia: una sola pauta "viva" por (tipo, recurso).
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_promotion_live_target"
      ON "promotions" ("type", "target_id")
      WHERE "status" IN ('PENDING_PAYMENT','IN_REVIEW','APPROVED','SCHEDULED','ACTIVE')
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "promotion_pricing_config" (
        "id"                  uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type"                character varying(20) NOT NULL,
        "amount"              numeric(12,2) NOT NULL,
        "currency"            character varying(3) NOT NULL DEFAULT 'COP',
        "is_active"           boolean NOT NULL DEFAULT true,
        "effective_from"      timestamptz NOT NULL DEFAULT now(),
        "effective_until"     timestamptz,
        "created_by_user_id"  uuid,
        "created_by_name"     character varying(150),
        "created_at"          timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_promotion_pricing_config" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_promotion_pricing_type_active" ON "promotion_pricing_config" ("type", "is_active")`,
    );

    // Seed de precios iniciales (COP). El superadmin puede ajustarlos desde la UI.
    await queryRunner.query(`
      INSERT INTO "promotion_pricing_config" ("type", "amount", "currency", "is_active", "created_by_name")
      SELECT 'TRACK', 50000, 'COP', true, 'seed'
      WHERE NOT EXISTS (
        SELECT 1 FROM "promotion_pricing_config" WHERE "type" = 'TRACK' AND "is_active" = true AND "effective_until" IS NULL
      )
    `);
    await queryRunner.query(`
      INSERT INTO "promotion_pricing_config" ("type", "amount", "currency", "is_active", "created_by_name")
      SELECT 'COMPOSER', 30000, 'COP', true, 'seed'
      WHERE NOT EXISTS (
        SELECT 1 FROM "promotion_pricing_config" WHERE "type" = 'COMPOSER' AND "is_active" = true AND "effective_until" IS NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "promotion_pricing_config"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_promotion_live_target"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promotions"`);
  }
}
