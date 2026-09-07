import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Política de seguridad por organización (§4). `organization_id` es único: una
 * organización tiene a lo sumo una política. La evaluación de MFA/Passkey
 * requerida es siempre tenant-aware y no altera la configuración global del
 * usuario.
 */
export class CreateOrganizationSecurityPolicyTable1789400000000 implements MigrationInterface {
  name = 'CreateOrganizationSecurityPolicyTable1789400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_security_policies" (
        "id"                      uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id"         uuid NOT NULL,
        "mfa_required"            boolean NOT NULL DEFAULT false,
        "passkey_required"        boolean NOT NULL DEFAULT false,
        "totp_allowed"            boolean NOT NULL DEFAULT true,
        "recovery_codes_required" boolean NOT NULL DEFAULT false,
        "created_at"              timestamptz NOT NULL DEFAULT now(),
        "updated_at"              timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organization_security_policies" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_organization_security_policies_org" UNIQUE ("organization_id"),
        CONSTRAINT "FK_organization_security_policies_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_security_policies"`);
  }
}
