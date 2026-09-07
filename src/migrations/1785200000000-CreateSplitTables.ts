import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tablas del módulo de Split de coautoría: `split` (uno-a-uno con `track`) y
 * `split_author` (tabla puente con porcentaje/rol/estado de firma por coautor).
 * La regla "suma de porcentajes = 100" es cross-fila y se valida en SplitService,
 * no hay CHECK de BD para eso (mismo criterio que el resto de reglas de negocio
 * del repo). `intellectual_property.document_url` pasa a ser opcional y se agrega
 * `metadata` jsonb para el snapshot que genera SplitService al completarse un split.
 */
export class CreateSplitTables1785200000000 implements MigrationInterface {
  name = 'CreateSplitTables1785200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "intellectual_property" ALTER COLUMN "document_url" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "intellectual_property" ADD "metadata" jsonb`);

    await queryRunner.query(`CREATE TYPE "public"."split_status_enum" AS ENUM('pending_approval', 'completed', 'blocked')`);
    await queryRunner.query(`
      CREATE TABLE "split" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "track_id" uuid NOT NULL,
        "status" "public"."split_status_enum" NOT NULL DEFAULT 'pending_approval',
        "created_by" uuid NOT NULL,
        "intellectual_property_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_split_track" UNIQUE ("track_id"),
        CONSTRAINT "PK_split" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`ALTER TABLE "split" ADD CONSTRAINT "FK_split_track" FOREIGN KEY ("track_id") REFERENCES "track"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "split" ADD CONSTRAINT "FK_split_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "split" ADD CONSTRAINT "FK_split_intellectual_property" FOREIGN KEY ("intellectual_property_id") REFERENCES "intellectual_property"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

    await queryRunner.query(`CREATE TYPE "public"."coauthor_role_enum" AS ENUM('compositor', 'autor', 'compositor_autor', 'adaptador', 'arreglista', 'traductor')`);
    await queryRunner.query(`CREATE TYPE "public"."split_author_status_enum" AS ENUM('pending', 'approved', 'rejected')`);
    await queryRunner.query(`
      CREATE TABLE "split_author" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "split_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "percentage" numeric(5,2) NOT NULL,
        "role" "public"."coauthor_role_enum" NOT NULL,
        "status" "public"."split_author_status_enum" NOT NULL DEFAULT 'pending',
        "rejection_reason" text,
        "signed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_split_user" UNIQUE ("split_id", "user_id"),
        CONSTRAINT "CHK_split_author_percentage" CHECK ("percentage" > 0 AND "percentage" <= 100),
        CONSTRAINT "PK_split_author" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`ALTER TABLE "split_author" ADD CONSTRAINT "FK_split_author_split" FOREIGN KEY ("split_id") REFERENCES "split"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "split_author" ADD CONSTRAINT "FK_split_author_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "split_author" DROP CONSTRAINT "FK_split_author_user"`);
    await queryRunner.query(`ALTER TABLE "split_author" DROP CONSTRAINT "FK_split_author_split"`);
    await queryRunner.query(`DROP TABLE "split_author"`);
    await queryRunner.query(`DROP TYPE "public"."split_author_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."coauthor_role_enum"`);

    await queryRunner.query(`ALTER TABLE "split" DROP CONSTRAINT "FK_split_intellectual_property"`);
    await queryRunner.query(`ALTER TABLE "split" DROP CONSTRAINT "FK_split_created_by"`);
    await queryRunner.query(`ALTER TABLE "split" DROP CONSTRAINT "FK_split_track"`);
    await queryRunner.query(`DROP TABLE "split"`);
    await queryRunner.query(`DROP TYPE "public"."split_status_enum"`);

    await queryRunner.query(`ALTER TABLE "intellectual_property" DROP COLUMN "metadata"`);
    await queryRunner.query(`ALTER TABLE "intellectual_property" ALTER COLUMN "document_url" SET NOT NULL`);
  }
}
