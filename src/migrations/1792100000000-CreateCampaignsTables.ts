import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Campañas para recibir canciones (ver
 * `requerimientos/B2B/sellos/CREACIÓN DE CAMPAÑAS PARA SELLOS.md`): tabla
 * `campaigns` (nunca se borra físicamente — se cierra por estado y se
 * conserva en el historial del creador) y `campaign_submissions` (postulación
 * de un compositor, único por track dentro de una misma campaña).
 *
 * `organization_id` es nullable: una campaña puede pertenecer a una
 * organización (sello/B2B) o ser personal de un usuario individual que puede
 * buscar canciones en el marketplace (`marketplace.search`/`license.request`)
 * sin pertenecer a ninguna organización — en ese caso `created_by_user_id` es
 * el dueño.
 */
export class CreateCampaignsTables1792100000000 implements MigrationInterface {
  name = 'CreateCampaignsTables1792100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaigns" (
        "id"                        uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id"           uuid,
        "created_by_user_id"        uuid NOT NULL,
        "title"                     character varying(150) NOT NULL,
        "author_name"               character varying(150) NOT NULL,
        "description"               text NOT NULL,
        "visibility"                character varying(10) NOT NULL DEFAULT 'PUBLIC',
        "private_token"             character varying,
        "cover_url"                 character varying,
        "genre_filters"             jsonb NOT NULL,
        "songs_per_composer_limit"  integer NOT NULL,
        "required_songs_count"      integer NOT NULL,
        "deadline"                  timestamptz NOT NULL,
        "status"                    character varying(10) NOT NULL DEFAULT 'ACTIVE',
        "closed_reason"             character varying(10),
        "closed_at"                 timestamptz,
        "created_at"                timestamptz NOT NULL DEFAULT now(),
        "updated_at"                timestamptz NOT NULL DEFAULT now(),
        "deleted_at"                timestamptz,
        CONSTRAINT "PK_campaigns" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_campaign_organization_status" ON "campaigns" ("organization_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_campaign_creator_status" ON "campaigns" ("created_by_user_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_campaign_public_listing" ON "campaigns" ("visibility", "status", "deadline")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_campaign_private_token"
      ON "campaigns" ("private_token")
      WHERE "private_token" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaign_submissions" (
        "id"                  uuid NOT NULL DEFAULT uuid_generate_v4(),
        "campaign_id"         uuid NOT NULL,
        "track_id"            uuid NOT NULL,
        "composer_id"         uuid NOT NULL,
        "status"              character varying(10) NOT NULL DEFAULT 'PENDING',
        "requested_track_id"  uuid,
        "created_at"          timestamptz NOT NULL DEFAULT now(),
        "updated_at"          timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_campaign_submissions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_campaign_submission_campaign" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_campaign_submission_track" FOREIGN KEY ("track_id") REFERENCES "track"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_campaign_submission_composer" FOREIGN KEY ("composer_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_campaign_submission_track" ON "campaign_submissions" ("campaign_id", "track_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_campaign_submission_composer" ON "campaign_submissions" ("composer_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_submissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaigns"`);
  }
}
