import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renombra "subgénero" a "ritmo" (término usado en la industria musical)
 * en las columnas `track.sub_genre` y `musical_genre."subGenre"`.
 */
export class RenameSubGenreToRitmo1787200000000 implements MigrationInterface {
  name = 'RenameSubGenreToRitmo1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "track" RENAME COLUMN "sub_genre" TO "ritmo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "musical_genre" RENAME COLUMN "subGenre" TO "ritmo"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "musical_genre" RENAME COLUMN "ritmo" TO "subGenre"`,
    );
    await queryRunner.query(
      `ALTER TABLE "track" RENAME COLUMN "ritmo" TO "sub_genre"`,
    );
  }
}
