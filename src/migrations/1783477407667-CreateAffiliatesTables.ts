import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAffiliatesTables1783477407667 implements MigrationInterface {
    name = 'CreateAffiliatesTables1783477407667'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."affiliates_tier_enum" AS ENUM('standard', 'ambassador', 'partner')`);
        await queryRunner.query(`CREATE TYPE "public"."affiliates_status_enum" AS ENUM('approved', 'suspended', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "affiliates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "last_name" character varying(255) NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "phone" character varying, "country_code" character varying, "company_or_brand" character varying, "website" character varying, "audience_description" text, "social_networks" jsonb, "payment_phone" character varying, "bank_account" jsonb, "referral_code" character varying NOT NULL, "tier" "public"."affiliates_tier_enum" NOT NULL DEFAULT 'standard', "status" "public"."affiliates_status_enum" NOT NULL DEFAULT 'approved', "accepted_terms_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_24ffa7680861d79b2d728b9d55e" UNIQUE ("email"), CONSTRAINT "UQ_448b328932a201c601036903631" UNIQUE ("referral_code"), CONSTRAINT "PK_5458bf988fb83086da3a14b9ff9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."affiliate_commissions_commission_type_enum" AS ENUM('first_purchase', 'recurring')`);
        await queryRunner.query(`CREATE TYPE "public"."affiliate_commissions_tier_enum" AS ENUM('standard', 'ambassador', 'partner')`);
        await queryRunner.query(`CREATE TYPE "public"."affiliate_commissions_status_enum" AS ENUM('pending', 'approved', 'paid', 'rejected')`);
        await queryRunner.query(`CREATE TYPE "public"."affiliate_commissions_plan_role_enum" AS ENUM('admin', 'autor', 'interprete', 'cantautor', 'invitado', 'editor')`);
        await queryRunner.query(`CREATE TYPE "public"."affiliate_commissions_billing_period_enum" AS ENUM('monthly', 'annual')`);
        await queryRunner.query(`CREATE TABLE "affiliate_commissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "affiliate_id" uuid NOT NULL, "referred_user_id" uuid NOT NULL, "payment_id" uuid NOT NULL, "external_reference" character varying, "commission_type" "public"."affiliate_commissions_commission_type_enum" NOT NULL, "tier" "public"."affiliate_commissions_tier_enum" NOT NULL, "commission_rate" numeric(5,2) NOT NULL, "sale_amount" numeric(12,2) NOT NULL, "commission_amount" numeric(12,2) NOT NULL, "currency" character varying NOT NULL DEFAULT 'COP', "status" "public"."affiliate_commissions_status_enum" NOT NULL DEFAULT 'pending', "plan_role" "public"."affiliate_commissions_plan_role_enum" NOT NULL, "billing_period" "public"."affiliate_commissions_billing_period_enum", "is_first_purchase" boolean NOT NULL, "approval_due_at" TIMESTAMP WITH TIME ZONE NOT NULL, "approved_at" TIMESTAMP WITH TIME ZONE, "paid_at" TIMESTAMP WITH TIME ZONE, "rejected_at" TIMESTAMP WITH TIME ZONE, "rejection_reason" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_77280f803a87debac03319456b1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bb0d226688f2434df93f79659b" ON "affiliate_commissions" ("payment_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_059707dbcdcc90a04eb10a96c2" ON "affiliate_commissions" ("referred_user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_500b61519c26e7553cd59ef1f1" ON "affiliate_commissions" ("affiliate_id", "status") `);
        await queryRunner.query(`ALTER TABLE "users" ADD "referred_by_affiliate_id" uuid`);
        await queryRunner.query(`ALTER TABLE "users" ADD "referred_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "FK_338a2fed8f6b73ddaae39fb8e44" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "affiliate_commissions" DROP CONSTRAINT "FK_338a2fed8f6b73ddaae39fb8e44"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "referred_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "referred_by_affiliate_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_500b61519c26e7553cd59ef1f1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_059707dbcdcc90a04eb10a96c2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bb0d226688f2434df93f79659b"`);
        await queryRunner.query(`DROP TABLE "affiliate_commissions"`);
        await queryRunner.query(`DROP TYPE "public"."affiliate_commissions_billing_period_enum"`);
        await queryRunner.query(`DROP TYPE "public"."affiliate_commissions_plan_role_enum"`);
        await queryRunner.query(`DROP TYPE "public"."affiliate_commissions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."affiliate_commissions_tier_enum"`);
        await queryRunner.query(`DROP TYPE "public"."affiliate_commissions_commission_type_enum"`);
        await queryRunner.query(`DROP TABLE "affiliates"`);
        await queryRunner.query(`DROP TYPE "public"."affiliates_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."affiliates_tier_enum"`);
    }

}
