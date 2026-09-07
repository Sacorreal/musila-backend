import { MigrationInterface, QueryRunner } from 'typeorm';
import { generateMcid } from '../creator-id/utils/generate-mcid.util';

export class AddMusilaCreatorIdToUsers1784800000000
  implements MigrationInterface
{
  name = 'AddMusilaCreatorIdToUsers1784800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "musila_creator_id" character varying`,
    );

    const users: { id: string }[] = await queryRunner.query(
      `SELECT id FROM "users"`,
    );
    const assigned = new Set<string>();

    for (const { id } of users) {
      let mcid: string;
      do {
        mcid = generateMcid();
        if (assigned.has(mcid)) continue;
        const [existing] = await queryRunner.query(
          `SELECT 1 FROM "users" WHERE musila_creator_id = $1`,
          [mcid],
        );
        if (!existing) break;
      } while (true);

      assigned.add(mcid);
      await queryRunner.query(
        `UPDATE "users" SET musila_creator_id = $1 WHERE id = $2`,
        [mcid, id],
      );
    }

    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "musila_creator_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_users_musila_creator_id" UNIQUE ("musila_creator_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_users_musila_creator_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "musila_creator_id"`,
    );
  }
}
