import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * IPI de la editorial (CISAC) a nivel de organización: una publisher tiene un
 * único número IPI compartido por todo su roster, no uno por cada autor.
 * Usado por el Editorial Command Center (Split Editorial) para validar que la
 * editorial esté correctamente registrada.
 */
export class AddIpiNumberToOrganization1791200000000 implements MigrationInterface {
  name = 'AddIpiNumberToOrganization1791200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "organizations" ADD COLUMN "ipi_number" varchar(50)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN "ipi_number"`);
  }
}
