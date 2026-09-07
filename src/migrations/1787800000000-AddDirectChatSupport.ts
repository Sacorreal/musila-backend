import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Soporte para chats directos usuario ↔ usuario (no atados a una solicitud):
 * - Columna `chat.type` (REQUEST | DIRECT) para distinguir el origen del chat.
 * - Tabla intermedia `chat_participants` que enlaza un chat directo con los
 *   usuarios que participan en él (los chats de solicitud siguen derivando sus
 *   participantes desde `requestId`).
 *
 * La columna `requestId` ya era nullable en el esquema base, por lo que no se
 * altera su nulabilidad aquí.
 */
export class AddDirectChatSupport1787800000000 implements MigrationInterface {
  name = 'AddDirectChatSupport1787800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "public"."chat_type_enum" AS ENUM('REQUEST','DIRECT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat" ADD COLUMN IF NOT EXISTS "type" "public"."chat_type_enum" NOT NULL DEFAULT 'REQUEST'`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_participants" (
        "chat_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        CONSTRAINT "PK_chat_participants" PRIMARY KEY ("chat_id", "user_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_chat_participants_user" ON "chat_participants" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ADD CONSTRAINT "FK_chat_participants_chat" FOREIGN KEY ("chat_id") REFERENCES "chat"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ADD CONSTRAINT "FK_chat_participants_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_chat_participants_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_chat_participants_chat"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_chat_participants_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_participants"`);
    await queryRunner.query(`ALTER TABLE "chat" DROP COLUMN IF EXISTS "type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."chat_type_enum"`);
  }
}
