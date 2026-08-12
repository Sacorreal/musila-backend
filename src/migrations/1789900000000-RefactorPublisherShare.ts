import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Refactor "Publisher's Share": el porcentaje que declara la publisher deja de
 * ser un coautor del split y pasa a ser metadata informativa, configurada de
 * forma global por autor.
 *
 * - `publisher_roster_coauthor_defaults` → `publisher_shares`, sin la columna
 *   `role` (ya no es coautor, es solo un porcentaje).
 * - `split_author` vuelve a ser exclusivamente de personas: se elimina la
 *   polimorfia con organización (columna `organization_id`, CHECK, índice único
 *   parcial) y `user_id` vuelve a ser NOT NULL. Las filas de organización que
 *   hubiera se descartan (su información vive ahora en el expediente del track).
 *
 * Se ejecuta siempre después de 1789800000000 (orden por timestamp); los `IF
 * EXISTS` la hacen robusta ante reejecuciones.
 */
export class RefactorPublisherShare1789900000000 implements MigrationInterface {
  name = 'RefactorPublisherShare1789900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Config: renombrar tabla y quitar el rol ─────────────────────────────
    await queryRunner.query(`ALTER TABLE IF EXISTS "publisher_roster_coauthor_defaults" RENAME TO "publisher_shares"`);
    await queryRunner.query(`ALTER TABLE "publisher_shares" DROP COLUMN IF EXISTS "role"`);
    await queryRunner.query(`ALTER TABLE "publisher_shares" RENAME CONSTRAINT "PK_publisher_roster_coauthor_defaults" TO "PK_publisher_shares"`);
    await queryRunner.query(`ALTER TABLE "publisher_shares" RENAME CONSTRAINT "UQ_publisher_roster_coauthor_org_user" TO "UQ_publisher_shares_org_user"`);
    await queryRunner.query(`ALTER TABLE "publisher_shares" RENAME CONSTRAINT "FK_publisher_roster_coauthor_org" TO "FK_publisher_shares_org"`);
    await queryRunner.query(`ALTER TABLE "publisher_shares" RENAME CONSTRAINT "FK_publisher_roster_coauthor_user" TO "FK_publisher_shares_user"`);
    await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_publisher_roster_coauthor_org" RENAME TO "IDX_publisher_shares_org"`);

    // ── split_author: solo personas (se elimina la polimorfia con organización) ──
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_split_organization"`);
    await queryRunner.query(`ALTER TABLE "split_author" DROP CONSTRAINT IF EXISTS "CHK_split_author_single_party"`);
    await queryRunner.query(`ALTER TABLE "split_author" DROP CONSTRAINT IF EXISTS "FK_split_author_organization"`);
    await queryRunner.query(`DELETE FROM "split_author" WHERE "user_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "split_author" DROP COLUMN IF EXISTS "organization_id"`);
    await queryRunner.query(`ALTER TABLE "split_author" ALTER COLUMN "user_id" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── split_author: restaurar la polimorfia con organización ──────────────
    await queryRunner.query(`ALTER TABLE "split_author" ALTER COLUMN "user_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "split_author" ADD "organization_id" uuid`);
    await queryRunner.query(`ALTER TABLE "split_author" ADD CONSTRAINT "FK_split_author_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "split_author" ADD CONSTRAINT "CHK_split_author_single_party" CHECK (num_nonnulls("user_id", "organization_id") = 1)`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_split_organization" ON "split_author" ("split_id", "organization_id") WHERE "organization_id" IS NOT NULL`);

    // ── Config: restaurar el rol y volver al nombre anterior ────────────────
    await queryRunner.query(`ALTER TABLE "publisher_shares" ADD "role" "public"."coauthor_role_enum" NOT NULL DEFAULT 'compositor'`);
    await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_publisher_shares_org" RENAME TO "IDX_publisher_roster_coauthor_org"`);
    await queryRunner.query(`ALTER TABLE "publisher_shares" RENAME CONSTRAINT "FK_publisher_shares_user" TO "FK_publisher_roster_coauthor_user"`);
    await queryRunner.query(`ALTER TABLE "publisher_shares" RENAME CONSTRAINT "FK_publisher_shares_org" TO "FK_publisher_roster_coauthor_org"`);
    await queryRunner.query(`ALTER TABLE "publisher_shares" RENAME CONSTRAINT "UQ_publisher_shares_org_user" TO "UQ_publisher_roster_coauthor_org_user"`);
    await queryRunner.query(`ALTER TABLE "publisher_shares" RENAME CONSTRAINT "PK_publisher_shares" TO "PK_publisher_roster_coauthor_defaults"`);
    await queryRunner.query(`ALTER TABLE IF EXISTS "publisher_shares" RENAME TO "publisher_roster_coauthor_defaults"`);
  }
}
