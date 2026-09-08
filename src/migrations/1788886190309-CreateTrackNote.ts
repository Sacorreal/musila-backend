import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTrackNote1788886190309 implements MigrationInterface {
    name = 'CreateTrackNote1788886190309'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "track_note" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "content" text NOT NULL, "timestamp_seconds" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "track_id" uuid NOT NULL, "playlist_id" uuid, "author_user_id" uuid, "author_guest_id" uuid, CONSTRAINT "PK_be9b0f62c38ffde208131e53f35" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_efa8504aeec4fda3f157daa8a4" ON "track_note" ("track_id", "playlist_id") `);
        await queryRunner.query(`ALTER TABLE "track_note" ADD CONSTRAINT "FK_81314d741349af8d299df257a76" FOREIGN KEY ("track_id") REFERENCES "track"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "track_note" ADD CONSTRAINT "FK_e87bb78cee33839897e75cb982c" FOREIGN KEY ("playlist_id") REFERENCES "playlist"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "track_note" ADD CONSTRAINT "FK_ff830f837e0402cd0f833162255" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "track_note" ADD CONSTRAINT "FK_5bc5a8770ad60088e5c673569ce" FOREIGN KEY ("author_guest_id") REFERENCES "guest"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "track_note" DROP CONSTRAINT "FK_5bc5a8770ad60088e5c673569ce"`);
        await queryRunner.query(`ALTER TABLE "track_note" DROP CONSTRAINT "FK_ff830f837e0402cd0f833162255"`);
        await queryRunner.query(`ALTER TABLE "track_note" DROP CONSTRAINT "FK_e87bb78cee33839897e75cb982c"`);
        await queryRunner.query(`ALTER TABLE "track_note" DROP CONSTRAINT "FK_81314d741349af8d299df257a76"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_efa8504aeec4fda3f157daa8a4"`);
        await queryRunner.query(`DROP TABLE "track_note"`);
    }

}
