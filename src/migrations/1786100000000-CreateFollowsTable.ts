import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabla `follows`: relación de seguimiento entre usuarios (follower → following).
 * La unicidad compuesta evita duplicados y sirve de índice para "¿A sigue a B?";
 * el índice adicional en `following_id` acelera el conteo de seguidores y el
 * listado de followers al notificar publicaciones nuevas.
 */
export class CreateFollowsTable1786100000000 implements MigrationInterface {
  name = 'CreateFollowsTable1786100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "follows" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "follower_id" uuid NOT NULL,
        "following_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_follows" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_follows_follower_following" UNIQUE ("follower_id", "following_id"),
        CONSTRAINT "CHK_follows_no_self_follow" CHECK ("follower_id" <> "following_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_follows_following" ON "follows" ("following_id")`);
    await queryRunner.query(`ALTER TABLE "follows" ADD CONSTRAINT "FK_follows_follower" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "follows" ADD CONSTRAINT "FK_follows_following" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "follows" DROP CONSTRAINT "FK_follows_following"`);
    await queryRunner.query(`ALTER TABLE "follows" DROP CONSTRAINT "FK_follows_follower"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_follows_following"`);
    await queryRunner.query(`DROP TABLE "follows"`);
  }
}
