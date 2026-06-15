import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDiasporaSpecialist1781320000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "agents" ADD COLUMN "isDiasporaSpecialist" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "agents" DROP COLUMN "isDiasporaSpecialist"`);
  }
}
