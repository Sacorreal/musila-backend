import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Partitura del track (PDF): par opcional key/url de storage, igual patrón
 * que la portada (`cover_key`/`cover_url`).
 */
export class AddSheetMusicToTracks1787000000000 implements MigrationInterface {
  name = 'AddSheetMusicToTracks1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "track" ADD COLUMN "sheet_music_key" character varying`);
    await queryRunner.query(`ALTER TABLE "track" ADD COLUMN "sheet_music_url" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "track" DROP COLUMN "sheet_music_url"`);
    await queryRunner.query(`ALTER TABLE "track" DROP COLUMN "sheet_music_key"`);
  }
}
