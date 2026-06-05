import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1780632722859 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Extensions ───────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ── Enum types (DO $$ = no-op si ya existen) ─────────────────────────────
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."users_role_enum" AS ENUM('admin','autor','interprete','cantautor','invitado','editor'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."users_plan_enum" AS ENUM('free','pro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."guest_role_enum" AS ENUM('admin','autor','interprete','cantautor','invitado','editor'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."message_type_enum" AS ENUM('TEXT','FILE','IMAGE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."playlist_collaborator_permission_enum" AS ENUM('read','write','admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."requested_track_status_enum" AS ENUM('aprobada','rechazada','pendiente','cancelada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."requested_track_licensetype_enum" AS ENUM('licencia de primer uso','licencia traduccion','licencia reproduccion','licencia sincronizacion'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."payments_status_enum" AS ENUM('approved','rejected','pending','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."payments_plan_type_enum" AS ENUM('free','pro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."payments_role_type_enum" AS ENUM('admin','autor','interprete','cantautor','invitado','editor'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."payments_payment_type_enum" AS ENUM('subscription','one_time'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."payments_billing_period_enum" AS ENUM('monthly','annual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."payments_provider_enum" AS ENUM('wompi'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."payment_sources_status_enum" AS ENUM('available','pending','error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."pending_registrations_role_enum" AS ENUM('admin','autor','interprete','cantautor','invitado','editor'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."pending_registrations_plan_enum" AS ENUM('free','pro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."pending_registrations_status_enum" AS ENUM('pending','payment_confirmed','completed','expired','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

    // ── Tablas (IF NOT EXISTS = no-op si ya existen en el DB local) ──────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "musical_genre" (
        "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
        "genre"      character varying NOT NULL,
        "subGenre"   text[],
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "deleted_at" timestamp,
        "slug"       text,
        CONSTRAINT "PK_musical_genre" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"                  uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name"                character varying(255) NOT NULL,
        "last_name"           character varying NOT NULL,
        "email"               character varying NOT NULL,
        "password"            character varying NOT NULL,
        "country_code"        character varying,
        "phone"               character varying,
        "type_citizen_id"     character varying,
        "citizen_id"          character varying,
        "role"                "public"."users_role_enum" NOT NULL DEFAULT 'invitado',
        "avatar"              character varying,
        "is_verified"         boolean NOT NULL DEFAULT false,
        "biography"           text,
        "social_networks"     jsonb,
        "created_at"          timestamptz NOT NULL DEFAULT now(),
        "updated_at"          timestamp NOT NULL DEFAULT now(),
        "deleted_at"          timestamp,
        "second_name"         character varying(255),
        "last_second_name"    character varying(255),
        "avatar_key"          character varying,
        "reset_token"         character varying,
        "reset_token_expires" timestamp,
        "plan"                "public"."users_plan_enum" NOT NULL DEFAULT 'free',
        "plan_expires_at"     timestamptz,
        "fiscal_name"         character varying,
        "tax_id"              character varying,
        "fiscal_address"      character varying,
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_log" (
        "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"    uuid NOT NULL,
        "action"     character varying(100) NOT NULL,
        "metadata"   jsonb,
        "ip_address" character varying,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_log" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_log_user_created" ON "audit_log" ("user_id", "created_at")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_preferred_genres" (
        "user_id"  uuid NOT NULL,
        "genre_id" uuid NOT NULL,
        CONSTRAINT "PK_user_preferred_genres" PRIMARY KEY ("user_id", "genre_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "guest" (
        "id"              uuid NOT NULL DEFAULT uuid_generate_v4(),
        "role"            "public"."guest_role_enum" NOT NULL DEFAULT 'invitado',
        "invitedById"     uuid NOT NULL,
        "name"            character varying(255) NOT NULL,
        "last_name"       character varying NOT NULL,
        "email"           character varying NOT NULL,
        "country_code"    character varying,
        "phone"           character varying,
        "type_citizen_id" character varying,
        "citizen_id"      character varying,
        "avatar"          character varying,
        "is_verified"     boolean NOT NULL DEFAULT true,
        "password"        character varying NOT NULL,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "updated_at"      timestamp NOT NULL DEFAULT now(),
        "deleted_at"      timestamp,
        CONSTRAINT "UQ_06f7a4d24efa523651c38fa35e9" UNIQUE ("email"),
        CONSTRAINT "PK_guest" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "track" (
        "id"            uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title"         character varying NOT NULL,
        "sub_genre"     character varying,
        "year"          integer,
        "language"      character varying NOT NULL,
        "lyric"         character varying,
        "externals_ids" jsonb,
        "is_available"  boolean NOT NULL DEFAULT true,
        "is_gospel"     boolean NOT NULL DEFAULT false,
        "created_at"    timestamp NOT NULL DEFAULT now(),
        "updated_at"    timestamp NOT NULL DEFAULT now(),
        "deleted_at"    timestamp,
        "genreId"       uuid NOT NULL,
        "coverUrl"      character varying,
        "audio_url"     character varying,
        "audio_key"     character varying NOT NULL DEFAULT 'sin-audio-key',
        "cover_key"     character varying,
        "iswc"          character varying,
        CONSTRAINT "PK_track" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "track_authors_users" (
        "trackId" uuid NOT NULL,
        "usersId" uuid NOT NULL,
        CONSTRAINT "PK_track_authors_users" PRIMARY KEY ("trackId", "usersId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "intellectual_property" (
        "id"           uuid NOT NULL DEFAULT uuid_generate_v4(),
        "document_url" character varying NOT NULL,
        "created_at"   timestamp NOT NULL DEFAULT now(),
        "updated_at"   timestamp NOT NULL DEFAULT now(),
        "deleted_at"   timestamp,
        "trackId"      uuid,
        "type"         character varying NOT NULL,
        "key"          character varying NOT NULL,
        "document_key" character varying,
        CONSTRAINT "PK_intellectual_property" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "playlist" (
        "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title"      character varying NOT NULL,
        "cover"      character varying,
        "ownerId"    uuid,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "deleted_at" timestamp,
        CONSTRAINT "PK_playlist" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "playlist_tracks" (
        "playlistId" uuid NOT NULL,
        "trackId"    uuid NOT NULL,
        CONSTRAINT "PK_playlist_tracks" PRIMARY KEY ("playlistId", "trackId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "playlist_collaborator" (
        "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
        "permission" "public"."playlist_collaborator_permission_enum" NOT NULL DEFAULT 'read',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "playlistId" uuid NOT NULL,
        "guestId"    uuid NOT NULL,
        CONSTRAINT "UQ_playlist_guest" UNIQUE ("playlistId", "guestId"),
        CONSTRAINT "PK_playlist_collaborator" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "playlist_guests" (
        "playlistId" uuid NOT NULL,
        "guestId"    uuid NOT NULL,
        CONSTRAINT "PK_playlist_guests" PRIMARY KEY ("playlistId", "guestId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invite" (
        "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token"       character varying NOT NULL,
        "email"       character varying,
        "is_used"     boolean NOT NULL DEFAULT false,
        "expires_at"  timestamptz NOT NULL,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        "invitedById" uuid NOT NULL,
        CONSTRAINT "UQ_83dbe83cb33c3e8468c8045ea7c" UNIQUE ("token"),
        CONSTRAINT "PK_invite" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id"           uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title"        character varying(255) NOT NULL,
        "message"      text NOT NULL,
        "type"         character varying(100) NOT NULL,
        "link"         character varying(255),
        "is_read"      boolean NOT NULL DEFAULT false,
        "data"         jsonb,
        "created_at"   timestamp NOT NULL DEFAULT now(),
        "recipient_id" uuid,
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "requested_track" (
        "id"                    uuid NOT NULL DEFAULT uuid_generate_v4(),
        "status"                "public"."requested_track_status_enum" NOT NULL DEFAULT 'pendiente',
        "licenseType"           "public"."requested_track_licensetype_enum" NOT NULL,
        "approved_by_requester" boolean NOT NULL DEFAULT false,
        "documentUrl"           text,
        "created_at"            timestamp NOT NULL DEFAULT now(),
        "updated_at"            timestamp NOT NULL DEFAULT now(),
        "deleted_at"            timestamp,
        "requesterId"           uuid,
        "trackId"               uuid,
        "approved_by_owner"     boolean NOT NULL DEFAULT false,
        "ownerId"               uuid,
        CONSTRAINT "PK_requested_track" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat" (
        "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamp NOT NULL DEFAULT now(),
        "requestId"  uuid,
        CONSTRAINT "REL_63f5d36cfbe8d7cf6a4bbb399f" UNIQUE ("requestId"),
        CONSTRAINT "PK_chat" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_guests" (
        "chat_id"  uuid NOT NULL,
        "guest_id" uuid NOT NULL,
        CONSTRAINT "PK_chat_guests" PRIMARY KEY ("chat_id", "guest_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "message" (
        "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
        "content"    text NOT NULL,
        "is_system"  boolean NOT NULL DEFAULT false,
        "type"       "public"."message_type_enum" NOT NULL DEFAULT 'TEXT',
        "fileUrl"    character varying,
        "fileKey"    character varying,
        "fileName"   character varying,
        "fileSize"   integer,
        "mimeType"   character varying,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "chatId"     uuid,
        "senderId"   uuid,
        "is_read"    boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_message" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id"                   uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"              character varying,
        "status"               "public"."payments_status_enum" NOT NULL DEFAULT 'pending',
        "amount"               numeric(12,2),
        "currency"             character varying NOT NULL DEFAULT 'COP',
        "plan_type"            "public"."payments_plan_type_enum" NOT NULL,
        "role_type"            "public"."payments_role_type_enum" NOT NULL,
        "payment_type"         "public"."payments_payment_type_enum" NOT NULL,
        "external_reference"   character varying,
        "expires_at"           timestamptz,
        "created_at"           timestamptz NOT NULL DEFAULT now(),
        "userId"               uuid,
        "billing_period"       "public"."payments_billing_period_enum",
        "provider"             "public"."payments_provider_enum" NOT NULL DEFAULT 'wompi',
        "wompi_transaction_id" character varying,
        "payment_source_id"    uuid,
        CONSTRAINT "PK_payments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payments_user_created" ON "payments" ("userId", "created_at")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_payments_wompi_tx" ON "payments" ("wompi_transaction_id") WHERE "wompi_transaction_id" IS NOT NULL`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_sources" (
        "id"                        uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"                   character varying NOT NULL,
        "wompi_payment_source_id"   character varying NOT NULL,
        "brand"                     character varying,
        "last4"                     character varying(4),
        "status"                    "public"."payment_sources_status_enum" NOT NULL DEFAULT 'pending',
        "acceptance_token_accepted" boolean NOT NULL DEFAULT false,
        "created_at"                timestamptz NOT NULL DEFAULT now(),
        "updated_at"                timestamptz NOT NULL DEFAULT now(),
        "userId"                    uuid NOT NULL,
        CONSTRAINT "PK_payment_sources" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payment_sources_userId" ON "payment_sources" ("userId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pending_registrations" (
        "id"                 uuid NOT NULL DEFAULT uuid_generate_v4(),
        "external_reference" character varying NOT NULL,
        "role"               "public"."pending_registrations_role_enum" NOT NULL,
        "plan"               "public"."pending_registrations_plan_enum" NOT NULL,
        "status"             "public"."pending_registrations_status_enum" NOT NULL DEFAULT 'pending',
        "user_id"            character varying,
        "expires_at"         timestamptz NOT NULL,
        "created_at"         timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_fc408470a28a3ce4b6bcb274a7b" UNIQUE ("external_reference"),
        CONSTRAINT "PK_pending_registrations" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pending_registrations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_sources"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "message"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_guests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "requested_track"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invite"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "playlist_guests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "playlist_collaborator"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "playlist_tracks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "playlist"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "intellectual_property"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "track_authors_users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "track"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "guest"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_preferred_genres"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_log"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "musical_genre"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."pending_registrations_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."pending_registrations_plan_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."pending_registrations_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."payment_sources_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."payments_provider_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."payments_billing_period_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."payments_payment_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."payments_role_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."payments_plan_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."payments_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."requested_track_licensetype_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."requested_track_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."playlist_collaborator_permission_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."message_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."guest_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_plan_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
  }
}
