import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1781258399113 implements MigrationInterface {
  name = 'InitialSchema1781258399113';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "favorites" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "propertyId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f9c880e929c6fa3bdb17c3f6d12" UNIQUE ("userId", "propertyId"), CONSTRAINT "PK_890818d27523748dd36a4d1bdc8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'agent', 'client')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'client', "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "phone" character varying, "avatar" character varying, "refreshTokenHash" character varying, "passwordResetToken" character varying, "passwordResetExpiry" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "agents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bio" text, "licenseNumber" character varying, "agency" character varying, "userId" uuid NOT NULL, CONSTRAINT "REL_f535e5b2c0f0dc7b7fc656ebc9" UNIQUE ("userId"), CONSTRAINT "PK_9c653f28ae19c5884d5baf6a1d9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "property_images" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "url" character varying NOT NULL, "isPrimary" boolean NOT NULL DEFAULT false, "propertyId" uuid NOT NULL, CONSTRAINT "PK_317c3774ee70c26d70c4f80e200" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."properties_type_enum" AS ENUM('sale', 'rent')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."properties_category_enum" AS ENUM('apartment', 'house', 'land', 'commercial')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."properties_status_enum" AS ENUM('draft', 'available', 'sold', 'rented')`,
    );
    await queryRunner.query(
      `CREATE TABLE "properties" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text NOT NULL, "price" numeric(12,2) NOT NULL, "type" "public"."properties_type_enum" NOT NULL, "category" "public"."properties_category_enum" NOT NULL, "status" "public"."properties_status_enum" NOT NULL DEFAULT 'draft', "surface" double precision, "rooms" integer, "bedrooms" integer, "bathrooms" integer, "address" character varying NOT NULL, "city" character varying NOT NULL, "zipCode" character varying, "country" character varying NOT NULL DEFAULT 'France', "latitude" numeric(10,7), "longitude" numeric(10,7), "features" jsonb, "agentId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2d83bfa0b9fcd45dee1785af44d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."appointments_status_enum" AS ENUM('pending', 'confirmed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "appointments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."appointments_status_enum" NOT NULL DEFAULT 'pending', "notes" text, "propertyId" uuid NOT NULL, "agentId" uuid NOT NULL, "clientId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4a437a9a27e948726b8bb3e36ad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" ADD CONSTRAINT "FK_e747534006c6e3c2f09939da60f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" ADD CONSTRAINT "FK_39fd1b53d2b44d5bc1d766f9a2a" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agents" ADD CONSTRAINT "FK_f535e5b2c0f0dc7b7fc656ebc91" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_images" ADD CONSTRAINT "FK_7a07b6b7f9418bf1d5160106694" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD CONSTRAINT "FK_353db6091069783cf1673cc82f6" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "FK_9cae1f7a9cfaae44351495f73e2" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "FK_3e8d0ebc5826f09dc33013df971" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "FK_c4dbd8eb292b83b5dc67be3cf45" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_c4dbd8eb292b83b5dc67be3cf45"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_3e8d0ebc5826f09dc33013df971"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_9cae1f7a9cfaae44351495f73e2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" DROP CONSTRAINT "FK_353db6091069783cf1673cc82f6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_images" DROP CONSTRAINT "FK_7a07b6b7f9418bf1d5160106694"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agents" DROP CONSTRAINT "FK_f535e5b2c0f0dc7b7fc656ebc91"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" DROP CONSTRAINT "FK_39fd1b53d2b44d5bc1d766f9a2a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" DROP CONSTRAINT "FK_e747534006c6e3c2f09939da60f"`,
    );
    await queryRunner.query(`DROP TABLE "appointments"`);
    await queryRunner.query(`DROP TYPE "public"."appointments_status_enum"`);
    await queryRunner.query(`DROP TABLE "properties"`);
    await queryRunner.query(`DROP TYPE "public"."properties_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."properties_category_enum"`);
    await queryRunner.query(`DROP TYPE "public"."properties_type_enum"`);
    await queryRunner.query(`DROP TABLE "property_images"`);
    await queryRunner.query(`DROP TABLE "agents"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TABLE "favorites"`);
  }
}
