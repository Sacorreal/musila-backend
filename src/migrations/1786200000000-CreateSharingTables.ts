import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Módulo "Compartir": enlaces únicos y rastreables para perfil/playlist/track
 * (`share_link`), lista de usuarios registrados autorizados a escuchar un
 * playlist/track compartido vía su Musila Creator ID (`share_authorized_recipient`,
 * revocación lógica con `revoked_at`) y log de auditoría de cada intento de
 * acceso, autorizado o no (`share_access_log`, sin FKs para no perder el
 * registro forense de tokens/recursos inválidos).
 */
export class CreateSharingTables1786200000000 implements MigrationInterface {
  name = 'CreateSharingTables1786200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."share_link_resource_type_enum" AS ENUM ('profile', 'playlist', 'track')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."share_access_log_resource_type_enum" AS ENUM ('profile', 'playlist', 'track')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."share_access_log_reason_enum" AS ENUM (
        'granted', 'owner_access', 'not_authenticated', 'not_authorized', 'expired', 'revoked', 'token_not_found'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "share_link" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token" varchar NOT NULL,
        "resource_type" "public"."share_link_resource_type_enum" NOT NULL,
        "resource_id" uuid NOT NULL,
        "owner_id" uuid NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "view_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_share_link" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_share_link_token" UNIQUE ("token")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_share_link_resource" ON "share_link" ("resource_type", "resource_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_share_link_owner" ON "share_link" ("owner_id")`);
    await queryRunner.query(`ALTER TABLE "share_link" ADD CONSTRAINT "FK_share_link_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`
      CREATE TABLE "share_authorized_recipient" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "share_link_id" uuid NOT NULL,
        "recipient_user_id" uuid NOT NULL,
        "recipient_musila_creator_id" varchar NOT NULL,
        "granted_by_id" uuid NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_share_authorized_recipient" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_share_authorized_recipient_link_user" UNIQUE ("share_link_id", "recipient_user_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_share_authorized_recipient_user" ON "share_authorized_recipient" ("recipient_user_id")`);
    await queryRunner.query(`ALTER TABLE "share_authorized_recipient" ADD CONSTRAINT "FK_share_authorized_recipient_link" FOREIGN KEY ("share_link_id") REFERENCES "share_link"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "share_authorized_recipient" ADD CONSTRAINT "FK_share_authorized_recipient_user" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "share_authorized_recipient" ADD CONSTRAINT "FK_share_authorized_recipient_granted_by" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`
      CREATE TABLE "share_access_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "share_link_id" uuid,
        "token" varchar NOT NULL,
        "resource_type" "public"."share_access_log_resource_type_enum",
        "resource_id" uuid,
        "accessor_user_id" uuid,
        "accessor_musila_creator_id" varchar,
        "granted" boolean NOT NULL,
        "reason" "public"."share_access_log_reason_enum" NOT NULL,
        "ip_address" varchar,
        "user_agent" varchar,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_share_access_log" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_share_access_log_link_created" ON "share_access_log" ("share_link_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_share_access_log_accessor_created" ON "share_access_log" ("accessor_user_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_share_access_log_resource_created" ON "share_access_log" ("resource_type", "resource_id", "created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "share_access_log"`);

    await queryRunner.query(`ALTER TABLE "share_authorized_recipient" DROP CONSTRAINT "FK_share_authorized_recipient_granted_by"`);
    await queryRunner.query(`ALTER TABLE "share_authorized_recipient" DROP CONSTRAINT "FK_share_authorized_recipient_user"`);
    await queryRunner.query(`ALTER TABLE "share_authorized_recipient" DROP CONSTRAINT "FK_share_authorized_recipient_link"`);
    await queryRunner.query(`DROP TABLE "share_authorized_recipient"`);

    await queryRunner.query(`ALTER TABLE "share_link" DROP CONSTRAINT "FK_share_link_owner"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_share_link_owner"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_share_link_resource"`);
    await queryRunner.query(`DROP TABLE "share_link"`);

    await queryRunner.query(`DROP TYPE "public"."share_access_log_reason_enum"`);
    await queryRunner.query(`DROP TYPE "public"."share_access_log_resource_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."share_link_resource_type_enum"`);
  }
}
