import { MigrationInterface, QueryRunner } from 'typeorm';
import { generateTempUsername } from '../username/utils/generate-temp-username.util';

/**
 * Reemplaza el Musila Creator ID autogenerado (MC-XXXXXX) por un username
 * elegido por el propio usuario. Los usuarios existentes reciben un username
 * temporal derivado de su nombre (`username_is_temporary = true`) y quedan
 * obligados a elegir uno definitivo (ver `UsernameRequiredWatcher` en el
 * frontend). La unicidad se garantiza con un índice único case-insensitive
 * sobre `LOWER(username)`.
 */
export class ReplaceMusilaCreatorIdWithUsername1791000000000
  implements MigrationInterface
{
  name = 'ReplaceMusilaCreatorIdWithUsername1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "musila_creator_id" TO "username"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_users_musila_creator_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "username_is_temporary" boolean NOT NULL DEFAULT false`,
    );

    const users: { id: string; name: string; last_name: string }[] =
      await queryRunner.query(`SELECT id, name, last_name FROM "users"`);
    const assigned = new Set<string>();

    for (const { id, name, last_name } of users) {
      let username: string;
      do {
        username = generateTempUsername(name, last_name);
        if (assigned.has(username.toLowerCase())) continue;
        const [existing] = await queryRunner.query(
          `SELECT 1 FROM "users" WHERE LOWER(username) = LOWER($1)`,
          [username],
        );
        if (!existing) break;
      } while (true);

      assigned.add(username.toLowerCase());
      await queryRunner.query(
        `UPDATE "users" SET username = $1, username_is_temporary = true WHERE id = $2`,
        [username, id],
      );
    }

    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_username_lower" ON "users" (LOWER("username"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_users_username_lower"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "username_is_temporary"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "username" TO "musila_creator_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_users_musila_creator_id" UNIQUE ("musila_creator_id")`,
    );
  }
}
