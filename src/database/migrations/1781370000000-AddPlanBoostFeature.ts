import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlanBoostFeature1781370000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "canBoost" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "canFeature" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plans" DROP COLUMN IF EXISTS "canFeature"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" DROP COLUMN IF EXISTS "canBoost"`,
    );
  }
}
