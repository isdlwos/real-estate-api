import {
  Column, CreateDateColumn, Entity, ManyToOne, JoinColumn,
  OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Agent } from '../../users/entities/agent.entity';
import { Property } from '../../properties/entities/property.entity';
import { RentPayment } from './rent-payment.entity';

export enum LeaseStatus {
  ACTIVE = 'active',
  TERMINATED = 'terminated',
  PENDING = 'pending',
}

@Entity('rental_leases')
export class RentalLease {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({ nullable: true, type: 'uuid' })
  propertyId: string | null;

  @ManyToOne(() => Property, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'propertyId' })
  property: Property | null;

  @Column()
  tenantName: string;

  @Column()
  tenantEmail: string;

  @Column({ nullable: true, type: 'varchar' })
  tenantPhone: string | null;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ nullable: true, type: 'date' })
  endDate: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monthlyRent: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  deposit: number;

  @Column({ type: 'enum', enum: LeaseStatus, default: LeaseStatus.ACTIVE })
  status: LeaseStatus;

  @Column({ default: true })
  autoRenew: boolean;

  @Column({ nullable: true, type: 'text' })
  entryNotes: string | null;

  @Column({ nullable: true, type: 'text' })
  exitNotes: string | null;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @OneToMany(() => RentPayment, (p) => p.lease, { cascade: true })
  payments: RentPayment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
