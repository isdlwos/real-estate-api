import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCloudinaryPublicId1781263682171 implements MigrationInterface {
  name = 'AddCloudinaryPublicId1781263682171';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "property_images" ADD "publicId" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "property_images" DROP COLUMN "publicId"`,
    );
  }
}
