import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1759287968214 implements MigrationInterface {
    name = 'InitialSchema1759287968214'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "merchants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7682193bcf281285d0a459c4b1e" UNIQUE ("email"), CONSTRAINT "PK_4fd312ef25f8e05ad47bfe7ed25" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."payment_methods_type_enum" AS ENUM('credit_card', 'debit_card', 'bank_transfer', 'digital_wallet')`);
        await queryRunner.query(`CREATE TABLE "payment_methods" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."payment_methods_type_enum" NOT NULL DEFAULT 'credit_card', "name" character varying(100) NOT NULL, "active" boolean NOT NULL DEFAULT true, "configuration" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "merchant_id" uuid NOT NULL, CONSTRAINT "PK_34f9b8c6dfb4ac3559f7e2820d1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed', 'refunded')`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reference" character varying NOT NULL, "amount" numeric(10,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'USD', "status" "public"."payments_status_enum" NOT NULL DEFAULT 'pending', "metadata" jsonb, "gatewayReference" character varying, "gatewayResponseCode" character varying, "errorMessage" character varying, "ipAddress" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "completedAt" TIMESTAMP, "payment_method_id" uuid, "merchantId" uuid, CONSTRAINT "UQ_866ddee0e17d9385b4e3b86851d" UNIQUE ("reference"), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "payment_methods" ADD CONSTRAINT "FK_1587438684caed519da64364541" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_71f027efdf4599e4d68c1586866" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_12fd861c33c885f01b9a7da7d93" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_12fd861c33c885f01b9a7da7d93"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_71f027efdf4599e4d68c1586866"`);
        await queryRunner.query(`ALTER TABLE "payment_methods" DROP CONSTRAINT "FK_1587438684caed519da64364541"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
        await queryRunner.query(`DROP TABLE "payment_methods"`);
        await queryRunner.query(`DROP TYPE "public"."payment_methods_type_enum"`);
        await queryRunner.query(`DROP TABLE "merchants"`);
    }

}
