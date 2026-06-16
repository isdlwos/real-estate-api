import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPropertyBoosts1781350000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "boostedUntil" TIMESTAMPTZ NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "featuredUntil" TIMESTAMPTZ NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "properties" DROP COLUMN IF EXISTS "featuredUntil"`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" DROP COLUMN IF EXISTS "boostedUntil"`,
    );
  }
}
