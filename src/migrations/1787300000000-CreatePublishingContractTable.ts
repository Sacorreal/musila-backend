import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Contratos editoriales registrados por el usuario, independientes de
 * cualquier track: un mismo contrato puede cubrir muchas obras (referenciado
 * desde `registration_file.publishing_contract_id`), evitando resubir el
 * mismo PDF en cada expediente.
 */
export class CreatePublishingContractTable1787300000000 implements MigrationInterface {
  name = 'CreatePublishingContractTable1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."publishing_contract_status_enum" AS ENUM('vigente', 'finalizado')`);

    await queryRunner.query(`
      CREATE TABLE "publishing_contract" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "owner_id" uuid NOT NULL,
        "publisher_name" varchar NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date,
        "document_key" varchar NOT NULL,
        "document_url" text NOT NULL,
        "status" "public"."publishing_contract_status_enum" NOT NULL DEFAULT 'vigente',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_publishing_contract" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "publishing_contract" ADD CONSTRAINT "FK_publishing_contract_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "publishing_contract" DROP CONSTRAINT "FK_publishing_contract_owner"`);
    await queryRunner.query(`DROP TABLE "publishing_contract"`);
    await queryRunner.query(`DROP TYPE "public"."publishing_contract_status_enum"`);
  }
}
