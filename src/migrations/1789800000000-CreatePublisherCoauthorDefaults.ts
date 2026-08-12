import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Coautoría por defecto de publishers sobre su roster:
 *
 * - `publisher_roster_coauthor_defaults`: por cada miembro del roster, si la
 *   publisher se inyecta como coautora (rol + porcentaje fijos).
 * - `split_author`: coautor polimórfico (usuario u organización). El `user_id`
 *   pasa a nullable, se agrega `organization_id` y un CHECK de exactamente uno
 *   de los dos. Se añade un índice único parcial por organización para impedir
 *   que la misma publisher figure dos veces en un split (el `UQ_split_user`
 *   existente ya no aplica a filas de organización porque `user_id` es NULL).
 */
export class CreatePublisherCoauthorDefaults1789800000000 implements MigrationInterface {
  name = 'CreatePublisherCoauthorDefaults1789800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Configuración de coautoría por defecto ──────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "publisher_roster_coauthor_defaults" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "enabled" boolean NOT NULL DEFAULT false,
        "role" "public"."coauthor_role_enum" NOT NULL DEFAULT 'compositor',
        "percentage" numeric(5,2) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_publisher_roster_coauthor_org_user" UNIQUE ("organization_id", "user_id"),
        CONSTRAINT "PK_publisher_roster_coauthor_defaults" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_publisher_roster_coauthor_org" ON "publisher_roster_coauthor_defaults" ("organization_id")`);
    await queryRunner.query(`ALTER TABLE "publisher_roster_coauthor_defaults" ADD CONSTRAINT "FK_publisher_roster_coauthor_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "publisher_roster_coauthor_defaults" ADD CONSTRAINT "FK_publisher_roster_coauthor_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    // ── split_author: coautor polimórfico (usuario u organización) ──────────
    await queryRunner.query(`ALTER TABLE "split_author" ALTER COLUMN "user_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "split_author" ADD "organization_id" uuid`);
    await queryRunner.query(`ALTER TABLE "split_author" ADD CONSTRAINT "FK_split_author_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "split_author" ADD CONSTRAINT "CHK_split_author_single_party" CHECK (num_nonnulls("user_id", "organization_id") = 1)`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_split_organization" ON "split_author" ("split_id", "organization_id") WHERE "organization_id" IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`DROP INDEX "public"."UQ_split_organization"`);
    await queryRunner.query(`ALTER TABLE "split_author" DROP CONSTRAINT "CHK_split_author_single_party"`);
    await queryRunner.query(`ALTER TABLE "split_author" DROP CONSTRAINT "FK_split_author_organization"`);
    await queryRunner.query(`DELETE FROM "split_author" WHERE "user_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "split_author" DROP COLUMN "organization_id"`);
    await queryRunner.query(`ALTER TABLE "split_author" ALTER COLUMN "user_id" SET NOT NULL`);

    await queryRunner.query(`ALTER TABLE "publisher_roster_coauthor_defaults" DROP CONSTRAINT "FK_publisher_roster_coauthor_user"`);
    await queryRunner.query(`ALTER TABLE "publisher_roster_coauthor_defaults" DROP CONSTRAINT "FK_publisher_roster_coauthor_org"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_publisher_roster_coauthor_org"`);
    await queryRunner.query(`DROP TABLE "publisher_roster_coauthor_defaults"`);
  }
}
