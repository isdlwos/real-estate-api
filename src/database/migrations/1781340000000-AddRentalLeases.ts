import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRentalLeases1781340000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TYPE lease_status_enum AS ENUM ('active', 'terminated', 'pending');
      CREATE TYPE payment_status_enum AS ENUM ('pending', 'paid', 'late');
      CREATE TABLE rental_leases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "agentId" UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        "propertyId" UUID REFERENCES properties(id) ON DELETE SET NULL,
        "tenantName" VARCHAR NOT NULL,
        "tenantEmail" VARCHAR NOT NULL,
        "tenantPhone" VARCHAR,
        "startDate" DATE NOT NULL,
        "endDate" DATE,
        "monthlyRent" DECIMAL(12,2) NOT NULL,
        deposit DECIMAL(12,2) NOT NULL DEFAULT 0,
        status lease_status_enum NOT NULL DEFAULT 'active',
        "entryNotes" TEXT,
        "exitNotes" TEXT,
        notes TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE rent_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "leaseId" UUID NOT NULL REFERENCES rental_leases(id) ON DELETE CASCADE,
        month VARCHAR(7) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        status payment_status_enum NOT NULL DEFAULT 'pending',
        "paidAt" TIMESTAMPTZ,
        notes TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE("leaseId", month)
      );
    `);
  }
  async down(qr: QueryRunner): Promise<void> {
    await qr.query(
      `DROP TABLE IF EXISTS rent_payments; DROP TABLE IF EXISTS rental_leases; DROP TYPE IF EXISTS payment_status_enum; DROP TYPE IF EXISTS lease_status_enum;`,
    );
  }
}
