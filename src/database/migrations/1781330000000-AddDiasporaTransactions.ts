import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDiasporaTransactions1781330000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "diaspora_transaction_status_enum" AS ENUM ('active', 'completed', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TABLE "diaspora_transactions" (
        "id"            UUID NOT NULL DEFAULT uuid_generate_v4(),
        "agentId"       UUID NOT NULL,
        "propertyId"    UUID,
        "clientName"    VARCHAR NOT NULL,
        "clientEmail"   VARCHAR NOT NULL,
        "clientPhone"   VARCHAR,
        "clientCountry" VARCHAR,
        "status"        "diaspora_transaction_status_enum" NOT NULL DEFAULT 'active',
        "steps"         JSONB NOT NULL DEFAULT '[]',
        "notes"         TEXT,
        "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_diaspora_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_diaspora_tx_agent"
          FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_diaspora_tx_property"
          FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_diaspora_tx_agentId" ON "diaspora_transactions" ("agentId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "diaspora_transactions"`);
    await queryRunner.query(`DROP TYPE "diaspora_transaction_status_enum"`);
  }
}
