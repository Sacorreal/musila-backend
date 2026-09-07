import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rastreo de reproducciones (`track_play`): ledger append-only de eventos de
 * reproducción efectiva. Alimenta las métricas de "reproducciones totales" y
 * "usuarios únicos" del dashboard del autor. `user_id` es nullable (SET NULL al
 * eliminar el usuario) para tolerar reproducciones anónimas; los usuarios
 * únicos se agregan sobre `user_id` no nulo. Índices en `track_id`, `user_id`,
 * `created_at` y compuesto `(track_id, user_id)` para el dedupe por ventana.
 */
export class CreateTrackPlayTable1789900000000 implements MigrationInterface {
  name = 'CreateTrackPlayTable1789900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "track_play" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "track_id" uuid NOT NULL,
        "user_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_track_play" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`ALTER TABLE "track_play" ADD CONSTRAINT "FK_track_play_track" FOREIGN KEY ("track_id") REFERENCES "track"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "track_play" ADD CONSTRAINT "FK_track_play_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`CREATE INDEX "IDX_track_play_track" ON "track_play" ("track_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_track_play_user" ON "track_play" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_track_play_created_at" ON "track_play" ("created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_track_play_track_user" ON "track_play" ("track_id", "user_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_track_play_track_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_track_play_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_track_play_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_track_play_track"`);
    await queryRunner.query(`ALTER TABLE "track_play" DROP CONSTRAINT "FK_track_play_user"`);
    await queryRunner.query(`ALTER TABLE "track_play" DROP CONSTRAINT "FK_track_play_track"`);
    await queryRunner.query(`DROP TABLE "track_play"`);
  }
}
