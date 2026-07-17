import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hasta esta migración, "users" y sus tablas dependientes no tenían FOREIGN KEY
 * físicas en la base de datos (los `onDelete: 'CASCADE'` de las entidades TypeORM
 * nunca se materializaron porque el proyecto corre con synchronize:false).
 * Esto agrega las constraints reales necesarias para poder eliminar un usuario
 * de forma física y que toda su data relacionada se elimine en cascada.
 *
 * payments y payment_sources usan ON DELETE SET NULL: el historial de
 * transacciones se conserva por motivos contables/legales aunque el usuario
 * sea eliminado. audit_log se deja sin FK a propósito, como bitácora
 * inmutable de lo ya ocurrido.
 */
export class AddCascadeDeleteForUserRelations1784249575261
  implements MigrationInterface
{
  name = 'AddCascadeDeleteForUserRelations1784249575261';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Limpieza de referencias huérfanas previas ───────────────────────────
    // Datos que ya apuntan a un id de usuario/track/etc. inexistente romperían
    // la creación de las constraints. Se depuran antes de aplicar las FKs.
    await queryRunner.query(`DELETE FROM "user_preferred_genres" upg WHERE NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = upg.user_id)`);
    await queryRunner.query(`DELETE FROM "user_preferred_genres" upg WHERE NOT EXISTS (SELECT 1 FROM "musical_genre" g WHERE g.id = upg.genre_id)`);
    await queryRunner.query(`DELETE FROM "guest" g WHERE NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = g."invitedById")`);
    await queryRunner.query(`DELETE FROM "track_authors_users" tau WHERE NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = tau."usersId")`);
    await queryRunner.query(`DELETE FROM "track_authors_users" tau WHERE NOT EXISTS (SELECT 1 FROM "track" t WHERE t.id = tau."trackId")`);
    await queryRunner.query(`DELETE FROM "playlist" p WHERE p."ownerId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = p."ownerId")`);
    await queryRunner.query(`DELETE FROM "playlist_collaborator" pc WHERE NOT EXISTS (SELECT 1 FROM "playlist" p WHERE p.id = pc."playlistId")`);
    await queryRunner.query(`DELETE FROM "playlist_collaborator" pc WHERE NOT EXISTS (SELECT 1 FROM "guest" g WHERE g.id = pc."guestId")`);
    await queryRunner.query(`DELETE FROM "playlist_tracks" pt WHERE NOT EXISTS (SELECT 1 FROM "playlist" p WHERE p.id = pt."playlistId")`);
    await queryRunner.query(`DELETE FROM "playlist_tracks" pt WHERE NOT EXISTS (SELECT 1 FROM "track" t WHERE t.id = pt."trackId")`);
    await queryRunner.query(`DELETE FROM "invite" i WHERE NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = i."invitedById")`);
    await queryRunner.query(`DELETE FROM "notifications" n WHERE n."recipient_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = n."recipient_id")`);
    await queryRunner.query(`DELETE FROM "requested_track" rt WHERE rt."requesterId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = rt."requesterId")`);
    await queryRunner.query(`DELETE FROM "requested_track" rt WHERE rt."ownerId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = rt."ownerId")`);
    await queryRunner.query(`DELETE FROM "requested_track" rt WHERE rt."trackId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "track" t WHERE t.id = rt."trackId")`);
    await queryRunner.query(`DELETE FROM "chat" c WHERE c."requestId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "requested_track" rt WHERE rt.id = c."requestId")`);
    await queryRunner.query(`DELETE FROM "chat_guests" cg WHERE NOT EXISTS (SELECT 1 FROM "chat" c WHERE c.id = cg.chat_id)`);
    await queryRunner.query(`DELETE FROM "chat_guests" cg WHERE NOT EXISTS (SELECT 1 FROM "guest" g WHERE g.id = cg.guest_id)`);
    await queryRunner.query(`DELETE FROM "message" m WHERE m."chatId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "chat" c WHERE c.id = m."chatId")`);
    await queryRunner.query(`DELETE FROM "message" m WHERE m."senderId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = m."senderId")`);
    await queryRunner.query(`DELETE FROM "intellectual_property" ip WHERE ip."trackId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "track" t WHERE t.id = ip."trackId")`);
    await queryRunner.query(`UPDATE "payments" SET "userId" = NULL WHERE "userId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = "payments"."userId")`);
    await queryRunner.query(`DELETE FROM "payment_sources" ps WHERE NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = ps."userId")`);

    // ── payment_sources: se preserva el historial, por lo que el vínculo debe
    // poder quedar en NULL en vez de forzar el borrado de la fuente de pago ──
    await queryRunner.query(`ALTER TABLE "payment_sources" ALTER COLUMN "userId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "payment_sources" ALTER COLUMN "user_id" DROP NOT NULL`);

    // ── Foreign keys ─────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "user_preferred_genres" ADD CONSTRAINT "FK_user_preferred_genres_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "user_preferred_genres" ADD CONSTRAINT "FK_user_preferred_genres_genre" FOREIGN KEY ("genre_id") REFERENCES "musical_genre"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "guest" ADD CONSTRAINT "FK_guest_invited_by" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "track_authors_users" ADD CONSTRAINT "FK_track_authors_users_user" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "track_authors_users" ADD CONSTRAINT "FK_track_authors_users_track" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "playlist" ADD CONSTRAINT "FK_playlist_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "playlist_collaborator" ADD CONSTRAINT "FK_playlist_collaborator_playlist" FOREIGN KEY ("playlistId") REFERENCES "playlist"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "playlist_collaborator" ADD CONSTRAINT "FK_playlist_collaborator_guest" FOREIGN KEY ("guestId") REFERENCES "guest"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "playlist_tracks" ADD CONSTRAINT "FK_playlist_tracks_playlist" FOREIGN KEY ("playlistId") REFERENCES "playlist"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "playlist_tracks" ADD CONSTRAINT "FK_playlist_tracks_track" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "invite" ADD CONSTRAINT "FK_invite_invited_by" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_recipient" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "requested_track" ADD CONSTRAINT "FK_requested_track_requester" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "requested_track" ADD CONSTRAINT "FK_requested_track_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "requested_track" ADD CONSTRAINT "FK_requested_track_track" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "chat" ADD CONSTRAINT "FK_chat_request" FOREIGN KEY ("requestId") REFERENCES "requested_track"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "chat_guests" ADD CONSTRAINT "FK_chat_guests_chat" FOREIGN KEY ("chat_id") REFERENCES "chat"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "chat_guests" ADD CONSTRAINT "FK_chat_guests_guest" FOREIGN KEY ("guest_id") REFERENCES "guest"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_message_chat" FOREIGN KEY ("chatId") REFERENCES "chat"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_message_sender" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "intellectual_property" ADD CONSTRAINT "FK_intellectual_property_track" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "payment_sources" ADD CONSTRAINT "FK_payment_sources_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payment_sources" DROP CONSTRAINT "FK_payment_sources_user"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_user"`);
    await queryRunner.query(`ALTER TABLE "intellectual_property" DROP CONSTRAINT "FK_intellectual_property_track"`);
    await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_message_sender"`);
    await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_message_chat"`);
    await queryRunner.query(`ALTER TABLE "chat_guests" DROP CONSTRAINT "FK_chat_guests_guest"`);
    await queryRunner.query(`ALTER TABLE "chat_guests" DROP CONSTRAINT "FK_chat_guests_chat"`);
    await queryRunner.query(`ALTER TABLE "chat" DROP CONSTRAINT "FK_chat_request"`);
    await queryRunner.query(`ALTER TABLE "requested_track" DROP CONSTRAINT "FK_requested_track_track"`);
    await queryRunner.query(`ALTER TABLE "requested_track" DROP CONSTRAINT "FK_requested_track_owner"`);
    await queryRunner.query(`ALTER TABLE "requested_track" DROP CONSTRAINT "FK_requested_track_requester"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_recipient"`);
    await queryRunner.query(`ALTER TABLE "invite" DROP CONSTRAINT "FK_invite_invited_by"`);
    await queryRunner.query(`ALTER TABLE "playlist_tracks" DROP CONSTRAINT "FK_playlist_tracks_track"`);
    await queryRunner.query(`ALTER TABLE "playlist_tracks" DROP CONSTRAINT "FK_playlist_tracks_playlist"`);
    await queryRunner.query(`ALTER TABLE "playlist_collaborator" DROP CONSTRAINT "FK_playlist_collaborator_guest"`);
    await queryRunner.query(`ALTER TABLE "playlist_collaborator" DROP CONSTRAINT "FK_playlist_collaborator_playlist"`);
    await queryRunner.query(`ALTER TABLE "playlist" DROP CONSTRAINT "FK_playlist_owner"`);
    await queryRunner.query(`ALTER TABLE "track_authors_users" DROP CONSTRAINT "FK_track_authors_users_track"`);
    await queryRunner.query(`ALTER TABLE "track_authors_users" DROP CONSTRAINT "FK_track_authors_users_user"`);
    await queryRunner.query(`ALTER TABLE "guest" DROP CONSTRAINT "FK_guest_invited_by"`);
    await queryRunner.query(`ALTER TABLE "user_preferred_genres" DROP CONSTRAINT "FK_user_preferred_genres_genre"`);
    await queryRunner.query(`ALTER TABLE "user_preferred_genres" DROP CONSTRAINT "FK_user_preferred_genres_user"`);

    await queryRunner.query(`ALTER TABLE "payment_sources" ALTER COLUMN "user_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "payment_sources" ALTER COLUMN "userId" SET NOT NULL`);
  }
}
