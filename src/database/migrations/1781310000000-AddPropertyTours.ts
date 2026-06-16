import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPropertyTours1781310000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "property_tours" (
        "id"          UUID NOT NULL DEFAULT uuid_generate_v4(),
        "propertyId"  UUID NOT NULL,
        "title"       VARCHAR,
        "imageUrl"    VARCHAR NOT NULL,
        "publicId"    VARCHAR,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_property_tours" PRIMARY KEY ("id"),
        CONSTRAINT "FK_property_tours_property"
          FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_property_tours_propertyId" ON "property_tours" ("propertyId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "property_tours"`);
  }
}
