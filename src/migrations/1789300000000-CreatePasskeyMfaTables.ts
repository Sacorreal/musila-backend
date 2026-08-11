import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tablas del subsistema de autenticación fuerte (Passkeys/WebAuthn, TOTP,
 * Recovery Codes, challenges y step-up grants). La autenticación queda
 * desacoplada de la autorización: estas tablas solo demuestran identidad.
 */
export class CreatePasskeyMfaTables1789300000000 implements MigrationInterface {
  name = 'CreatePasskeyMfaTables1789300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Passkeys (§5) ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_passkeys" (
        "id"            uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"       uuid NOT NULL,
        "credential_id" character varying NOT NULL,
        "public_key"    text NOT NULL,
        "sign_count"    bigint NOT NULL DEFAULT 0,
        "aaguid"        character varying,
        "device_type"   character varying,
        "backed_up"     boolean NOT NULL DEFAULT false,
        "transports"    jsonb,
        "name"          character varying(100),
        "created_at"    timestamptz NOT NULL DEFAULT now(),
        "last_used_at"  timestamptz,
        "revoked_at"    timestamptz,
        CONSTRAINT "PK_user_passkeys" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_passkeys_credential_id" UNIQUE ("credential_id"),
        CONSTRAINT "FK_user_passkeys_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_passkeys_user" ON "user_passkeys" ("user_id")`,
    );

    // ── Recovery Codes (§6) ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "recovery_codes" (
        "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"    uuid NOT NULL,
        "code_hash"  character varying NOT NULL,
        "used_at"    timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_recovery_codes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_recovery_codes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_recovery_codes_user_used" ON "recovery_codes" ("user_id", "used_at")`,
    );

    // ── TOTP (§7) ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_totp_factors" (
        "id"               uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"          uuid NOT NULL,
        "secret_encrypted" text NOT NULL,
        "confirmed_at"     timestamptz,
        "created_at"       timestamptz NOT NULL DEFAULT now(),
        "updated_at"       timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_totp_factors" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_totp_factors_user" UNIQUE ("user_id"),
        CONSTRAINT "FK_user_totp_factors_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // ── WebAuthn challenges (§10, §11, §20) ──────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "webauthn_challenges" (
        "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "challenge"   character varying NOT NULL,
        "type"        character varying(20) NOT NULL,
        "user_id"     uuid,
        "expires_at"  timestamptz NOT NULL,
        "consumed_at" timestamptz,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_webauthn_challenges" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_webauthn_challenges_challenge_type" ON "webauthn_challenges" ("challenge", "type")`,
    );

    // ── Step-up grants (§15) ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "step_up_grants" (
        "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"     uuid NOT NULL,
        "scope"       character varying(120) NOT NULL,
        "method"      character varying(20) NOT NULL,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        "expires_at"  timestamptz NOT NULL,
        "consumed_at" timestamptz,
        CONSTRAINT "PK_step_up_grants" PRIMARY KEY ("id"),
        CONSTRAINT "FK_step_up_grants_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_step_up_grants_user_scope" ON "step_up_grants" ("user_id", "scope")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_step_up_grants_user_scope"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "step_up_grants"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_webauthn_challenges_challenge_type"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "webauthn_challenges"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_totp_factors"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_recovery_codes_user_used"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recovery_codes"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_user_passkeys_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_passkeys"`);
  }
}
