import {
  Column, CreateDateColumn, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Agent } from '../../users/entities/agent.entity';

export enum CommissionInvoiceStatus {
  PENDING  = 'pending',
  PAID     = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('commission_invoices')
export class CommissionInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({ type: 'varchar', length: 7 })
  month: string; // YYYY-MM (mois pour lequel la commission est due)

  @Column({ type: 'int', default: 0 })
  paymentsCount: number; // nombre de loyers inclus

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalRentCollected: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  commissionAmount: number;

  @Column({ type: 'enum', enum: CommissionInvoiceStatus, default: CommissionInvoiceStatus.PENDING })
  status: CommissionInvoiceStatus;

  @Column({ nullable: true, type: 'varchar' })
  paydunyaToken: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  paidAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
