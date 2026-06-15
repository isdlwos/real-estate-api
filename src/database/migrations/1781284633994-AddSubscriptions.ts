import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSubscriptions1781284633994 implements MigrationInterface {
    name = 'AddSubscriptions1781284633994'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agentId" uuid NOT NULL, "subscriptionId" character varying, "amount" integer NOT NULL, "currency" character varying NOT NULL DEFAULT 'XOF', "status" character varying NOT NULL DEFAULT 'pending', "paydunyaToken" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agentId" uuid NOT NULL, "planId" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "startDate" TIMESTAMP WITH TIME ZONE, "expiresAt" TIMESTAMP WITH TIME ZONE, "paydunyaToken" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "price" integer NOT NULL, "maxListings" integer NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_e7b71bb444e74ee067df057397e" UNIQUE ("slug"), CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_ae67b32be4b3185775ae72db688" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_27288d6e651f2e767829fa83c4a" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_7536cba909dd7584a4640cad7d5" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_7536cba909dd7584a4640cad7d5"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_27288d6e651f2e767829fa83c4a"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_ae67b32be4b3185775ae72db688"`);
        await queryRunner.query(`DROP TABLE "plans"`);
        await queryRunner.query(`DROP TABLE "subscriptions"`);
        await queryRunner.query(`DROP TABLE "payments"`);
    }

}
