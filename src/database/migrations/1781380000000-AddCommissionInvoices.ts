import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommissionInvoices1781380000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "commission_invoices" (
        "id"                   uuid          NOT NULL DEFAULT gen_random_uuid(),
        "agentId"              uuid          NOT NULL,
        "month"                varchar(7)    NOT NULL,
        "paymentsCount"        integer       NOT NULL DEFAULT 0,
        "totalRentCollected"   numeric(12,2) NOT NULL,
        "commissionRate"       numeric(5,2)  NOT NULL,
        "commissionAmount"     numeric(12,2) NOT NULL,
        "status"               varchar(20)   NOT NULL DEFAULT 'pending',
        "paydunyaToken"        varchar       NULL,
        "paidAt"               timestamptz   NULL,
        "createdAt"            timestamptz   NOT NULL DEFAULT now(),
        "updatedAt"            timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "commission_invoices_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "commission_invoices_agent_month_unique" UNIQUE ("agentId", "month"),
        CONSTRAINT "commission_invoices_agent_id_fkey"
          FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "commission_invoices"`);
  }
}
