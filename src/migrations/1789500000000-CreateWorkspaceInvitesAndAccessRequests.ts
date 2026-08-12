import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enlace de invitación reutilizable a nivel de workspace y solicitudes de
 * acceso que genera cada invitado al registrarse a través del enlace. A
 * diferencia de `organization_invites` (por-email, un destinatario), el enlace
 * es genérico y revocable; cada registro crea una `organization_access_requests`
 * PENDING que el administrador aprueba asignando tipo (staff/roster) y rol.
 */
export class CreateWorkspaceInvitesAndAccessRequests1789500000000
  implements MigrationInterface
{
  name = 'CreateWorkspaceInvitesAndAccessRequests1789500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspace_invite_links" (
        "id"              uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "token"           character varying NOT NULL,
        "status"          character varying(20) NOT NULL DEFAULT 'ACTIVE',
        "created_by"      uuid,
        "expires_at"      timestamptz,
        "max_uses"        integer,
        "use_count"       integer NOT NULL DEFAULT 0,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "updated_at"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspace_invite_links" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_workspace_invite_links_token" UNIQUE ("token"),
        CONSTRAINT "FK_workspace_invite_links_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_workspace_invite_links_token" ON "workspace_invite_links" ("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workspace_invite_links_org_status" ON "workspace_invite_links" ("organization_id", "status")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_access_requests" (
        "id"                      uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id"         uuid NOT NULL,
        "invite_link_id"          uuid,
        "user_id"                 uuid NOT NULL,
        "status"                  character varying(20) NOT NULL DEFAULT 'PENDING',
        "decided_by"              uuid,
        "decided_at"              timestamptz,
        "rejection_reason"        character varying(500),
        "resulting_membership_id" uuid,
        "created_at"              timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organization_access_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_access_requests_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_access_requests_invite_link" FOREIGN KEY ("invite_link_id") REFERENCES "workspace_invite_links"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_access_requests_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_access_requests_org_status" ON "organization_access_requests" ("organization_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_access_requests_user" ON "organization_access_requests" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_access_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workspace_invite_links"`);
  }
}
