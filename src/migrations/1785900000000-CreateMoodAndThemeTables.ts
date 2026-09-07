import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tablas del catálogo de Moods y Temas (Anexo A/B de funcionalidad-moods.md):
 * `mood` (ManyToMany con `track`, mínimo 1 y máximo 2 por track, validado a nivel de
 * aplicación) y `theme` (ManyToOne opcional en `track`, máximo 1). También agrega
 * `track.is_feat` para marcar canciones grabadas a dúo/varias voces.
 * Se hace seed del catálogo fijo del Anexo A/B al final de `up()`.
 */
export class CreateMoodAndThemeTables1785900000000 implements MigrationInterface {
  name = 'CreateMoodAndThemeTables1785900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "mood" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "slug" character varying,
        "category" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_mood" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "theme" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "slug" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_theme" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "track_moods" (
        "trackId" uuid NOT NULL,
        "moodId" uuid NOT NULL,
        CONSTRAINT "PK_track_moods" PRIMARY KEY ("trackId", "moodId")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_track_moods_track" ON "track_moods" ("trackId")`);
    await queryRunner.query(`CREATE INDEX "IDX_track_moods_mood" ON "track_moods" ("moodId")`);
    await queryRunner.query(`ALTER TABLE "track_moods" ADD CONSTRAINT "FK_track_moods_track" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await queryRunner.query(`ALTER TABLE "track_moods" ADD CONSTRAINT "FK_track_moods_mood" FOREIGN KEY ("moodId") REFERENCES "mood"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "track" ADD "is_feat" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "track" ADD "themeId" uuid`);
    await queryRunner.query(`ALTER TABLE "track" ADD CONSTRAINT "FK_track_theme" FOREIGN KEY ("themeId") REFERENCES "theme"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

    // Seed — catálogo fijo del Anexo A/B (requerimientos/funcionalidad-moods.md)
    await queryRunner.query(`
      INSERT INTO "mood" ("name", "slug", "category") VALUES
        ('Amistad', 'amistad', 'Emociones positivas'),
        ('Jocosa', 'jocosa', 'Emociones positivas'),
        ('Alegre', 'alegre', 'Emociones positivas'),
        ('Superación personal', 'superacion-personal', 'Emociones positivas'),
        ('Nostálgica', 'nostalgica', 'Emociones melancólicas'),
        ('Despecho', 'despecho', 'Emociones melancólicas'),
        ('Traición', 'traicion', 'Emociones melancólicas'),
        ('Romántica (pareja)', 'romantica-pareja', 'Emociones sentimentales'),
        ('Sensual', 'sensual', 'Emociones sentimentales'),
        ('Amor', 'amor', 'Emociones sentimentales')
    `);

    await queryRunner.query(`
      INSERT INTO "theme" ("name", "slug") VALUES
        ('Fechas especiales', 'fechas-especiales'),
        ('Familia', 'familia'),
        ('Protesta / Social', 'protesta-social'),
        ('Navidad', 'navidad'),
        ('Lugar especial', 'lugar-especial')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "track" DROP CONSTRAINT "FK_track_theme"`);
    await queryRunner.query(`ALTER TABLE "track" DROP COLUMN "themeId"`);
    await queryRunner.query(`ALTER TABLE "track" DROP COLUMN "is_feat"`);

    await queryRunner.query(`ALTER TABLE "track_moods" DROP CONSTRAINT "FK_track_moods_mood"`);
    await queryRunner.query(`ALTER TABLE "track_moods" DROP CONSTRAINT "FK_track_moods_track"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_track_moods_mood"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_track_moods_track"`);
    await queryRunner.query(`DROP TABLE "track_moods"`);

    await queryRunner.query(`DROP TABLE "theme"`);
    await queryRunner.query(`DROP TABLE "mood"`);
  }
}
