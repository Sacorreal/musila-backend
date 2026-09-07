import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Añade el valor 'cantautor' al enum descriptivo `users_music_role_enum`
 * (columna `users.role`, MusicRole). No confundir con el valor histórico
 * 'cantautor' que existía en el antiguo enum de permisos y que la migración
 * 1784900000000 renombró a 'plan_360' en las tablas de plan_type — ese es
 * un tipo ENUM distinto y ya no contiene 'cantautor'.
 */
export class AddCantautorToMusicRoleEnum1786000000000
  implements MigrationInterface
{
  name = 'AddCantautorToMusicRoleEnum1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_music_role_enum" ADD VALUE IF NOT EXISTS 'cantautor'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres no soporta DROP VALUE en un tipo ENUM; migración no reversible.
  }
}
