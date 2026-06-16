import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeaseAutoRenew1781360000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rental_leases" ADD COLUMN IF NOT EXISTS "autoRenew" BOOLEAN NOT NULL DEFAULT TRUE`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rental_leases" DROP COLUMN IF EXISTS "autoRenew"`,
    );
  }
}
