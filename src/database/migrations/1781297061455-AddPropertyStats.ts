import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPropertyStats1781297061455 implements MigrationInterface {
  name = 'AddPropertyStats1781297061455';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "properties" ADD "viewCount" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD "contactCount" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "properties" DROP COLUMN "contactCount"`,
    );
    await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN "viewCount"`);
  }
}
