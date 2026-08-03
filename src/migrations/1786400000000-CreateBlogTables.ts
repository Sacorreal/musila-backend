import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tablas del módulo de Blog: `blog_author` (perfil editorial independiente, sin
 * relación con `user`), `blog_tag` ("Servicios Relacionados": url, nombre, ícono
 * lucide-react) y `blog_article` (contenido Markdown, imagen destacada, video de
 * YouTube), con relaciones ManyToMany hacia autores y etiquetas (mínimo 1 de cada
 * una, validado a nivel de aplicación, no de base de datos).
 */
export class CreateBlogTables1786400000000 implements MigrationInterface {
  name = 'CreateBlogTables1786400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "blog_author" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "role" character varying NOT NULL,
        "bio" text NOT NULL,
        "avatar_url" character varying,
        "avatar_key" character varying,
        "slug" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_blog_author" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "blog_tag" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "url" character varying NOT NULL,
        "icon" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_blog_tag" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE TYPE "public"."blog_article_status_enum" AS ENUM('draft', 'published')`);

    await queryRunner.query(`
      CREATE TABLE "blog_article" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "excerpt" text,
        "content_markdown" text NOT NULL,
        "cover_image_url" character varying,
        "cover_image_key" character varying,
        "youtube_url" character varying,
        "status" "public"."blog_article_status_enum" NOT NULL DEFAULT 'draft',
        "published_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_blog_article" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "blog_article_authors" (
        "blogArticleId" uuid NOT NULL,
        "blogAuthorId" uuid NOT NULL,
        CONSTRAINT "PK_blog_article_authors" PRIMARY KEY ("blogArticleId", "blogAuthorId")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_blog_article_authors_article" ON "blog_article_authors" ("blogArticleId")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_article_authors_author" ON "blog_article_authors" ("blogAuthorId")`);
    await queryRunner.query(`ALTER TABLE "blog_article_authors" ADD CONSTRAINT "FK_blog_article_authors_article" FOREIGN KEY ("blogArticleId") REFERENCES "blog_article"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await queryRunner.query(`ALTER TABLE "blog_article_authors" ADD CONSTRAINT "FK_blog_article_authors_author" FOREIGN KEY ("blogAuthorId") REFERENCES "blog_author"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

    await queryRunner.query(`
      CREATE TABLE "blog_article_tags" (
        "blogArticleId" uuid NOT NULL,
        "blogTagId" uuid NOT NULL,
        CONSTRAINT "PK_blog_article_tags" PRIMARY KEY ("blogArticleId", "blogTagId")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_blog_article_tags_article" ON "blog_article_tags" ("blogArticleId")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_article_tags_tag" ON "blog_article_tags" ("blogTagId")`);
    await queryRunner.query(`ALTER TABLE "blog_article_tags" ADD CONSTRAINT "FK_blog_article_tags_article" FOREIGN KEY ("blogArticleId") REFERENCES "blog_article"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await queryRunner.query(`ALTER TABLE "blog_article_tags" ADD CONSTRAINT "FK_blog_article_tags_tag" FOREIGN KEY ("blogTagId") REFERENCES "blog_tag"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

    // Índices únicos parciales (respetan soft delete: permiten reutilizar el slug/nombre tras eliminar)
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_blog_author_slug" ON "blog_author" ("slug") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_blog_author_name_lower" ON "blog_author" (LOWER("name")) WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_blog_article_slug" ON "blog_article" ("slug") WHERE "deleted_at" IS NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_blog_article_slug"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_blog_author_name_lower"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_blog_author_slug"`);

    await queryRunner.query(`ALTER TABLE "blog_article_tags" DROP CONSTRAINT "FK_blog_article_tags_tag"`);
    await queryRunner.query(`ALTER TABLE "blog_article_tags" DROP CONSTRAINT "FK_blog_article_tags_article"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_blog_article_tags_tag"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_blog_article_tags_article"`);
    await queryRunner.query(`DROP TABLE "blog_article_tags"`);

    await queryRunner.query(`ALTER TABLE "blog_article_authors" DROP CONSTRAINT "FK_blog_article_authors_author"`);
    await queryRunner.query(`ALTER TABLE "blog_article_authors" DROP CONSTRAINT "FK_blog_article_authors_article"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_blog_article_authors_author"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_blog_article_authors_article"`);
    await queryRunner.query(`DROP TABLE "blog_article_authors"`);

    await queryRunner.query(`DROP TABLE "blog_article"`);
    await queryRunner.query(`DROP TYPE "public"."blog_article_status_enum"`);

    await queryRunner.query(`DROP TABLE "blog_tag"`);
    await queryRunner.query(`DROP TABLE "blog_author"`);
  }
}
