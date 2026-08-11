import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Invitaciones por email para incorporar miembros (hoy, el Organization Admin
 * inicial) cuando el destinatario aún no tiene cuenta en Musila. El estado
 * "pendiente" no puede vivir en `organization_memberships` porque su `user_id`
 * es NOT NULL: la membership se crea recién al aceptar la invitación.
 */
export class CreateOrganizationInvitesTable1789200000000 implements MigrationInterface {
  name = 'CreateOrganizationInvitesTable1789200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_invites" (
        "id"               uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token"            character varying NOT NULL,
        "email"            character varying NOT NULL,
        "organization_id"  uuid NOT NULL,
        "role_key"         character varying NOT NULL DEFAULT 'ORGANIZATION_ADMIN',
        "membership_type"  character varying(20) NOT NULL DEFAULT 'ORGANIZATION',
        "status"           character varying(20) NOT NULL DEFAULT 'PENDING',
        "invited_by"       uuid,
        "accepted_user_id" uuid,
        "expires_at"       timestamptz NOT NULL,
        "accepted_at"      timestamptz,
        "created_at"       timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organization_invites" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_organization_invites_token" UNIQUE ("token"),
        CONSTRAINT "FK_organization_invites_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_organization_invites_email" ON "organization_invites" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_organization_invites_organization" ON "organization_invites" ("organization_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_organization_invites_organization"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_organization_invites_email"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_invites"`);
  }
}
