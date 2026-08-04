import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Esquema de RBAC de staff, separado del enum legado `UserPlanType`
 * (Postgres no permite DROP VALUE en enums, así que ese enum se deja intacto).
 * `staff_user_roles.user_id` es UNIQUE: un único rol interno activo por persona.
 */
export class CreateStaffAuthorizationTables1786700000000
  implements MigrationInterface
{
  name = 'CreateStaffAuthorizationTables1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_permissions" (
        "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code"        character varying(120) NOT NULL,
        "module"      character varying(50) NOT NULL,
        "description" character varying(255) NOT NULL,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_staff_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_staff_permissions_code" UNIQUE ("code")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_staff_permissions_module" ON "staff_permissions" ("module")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_roles" (
        "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name"        character varying(100) NOT NULL,
        "slug"        character varying(100) NOT NULL,
        "description" text,
        "is_system"   boolean NOT NULL DEFAULT false,
        "created_by"  uuid,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        "updated_at"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_staff_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_staff_roles_name" UNIQUE ("name"),
        CONSTRAINT "UQ_staff_roles_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_role_permissions" (
        "staff_role_id"       uuid NOT NULL,
        "staff_permission_id" uuid NOT NULL,
        CONSTRAINT "PK_staff_role_permissions" PRIMARY KEY ("staff_role_id", "staff_permission_id"),
        CONSTRAINT "FK_staff_role_permissions_role" FOREIGN KEY ("staff_role_id") REFERENCES "staff_roles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_staff_role_permissions_permission" FOREIGN KEY ("staff_permission_id") REFERENCES "staff_permissions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_staff_role_permissions_permission" ON "staff_role_permissions" ("staff_permission_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_user_roles" (
        "id"            uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"       uuid NOT NULL,
        "staff_role_id" uuid NOT NULL,
        "assigned_by"   uuid,
        "assigned_at"   timestamptz NOT NULL DEFAULT now(),
        "updated_at"    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_staff_user_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_staff_user_roles_user" UNIQUE ("user_id"),
        CONSTRAINT "FK_staff_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_staff_user_roles_role" FOREIGN KEY ("staff_role_id") REFERENCES "staff_roles"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_staff_user_roles_assigned_by" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_staff_user_roles_role" ON "staff_user_roles" ("staff_role_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_staff_user_roles_role"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_user_roles"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_staff_role_permissions_permission"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_roles"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_staff_permissions_module"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_permissions"`);
  }
}
