import {
  Column, CreateDateColumn, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { RentalLease } from './rental-lease.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  LATE = 'late',
}

@Entity('rent_payments')
export class RentPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  leaseId: string;

  @ManyToOne(() => RentalLease, (l) => l.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leaseId' })
  lease: RentalLease;

  @Column({ type: 'varchar', length: 7 })
  month: string; // YYYY-MM

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ nullable: true, type: 'timestamptz' })
  paidAt: Date | null;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  commissionAmount: number | null;

  @Column({ nullable: true, type: 'uuid' })
  commissionInvoiceId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
