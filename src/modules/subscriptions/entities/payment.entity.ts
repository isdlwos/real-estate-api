import {
  Column, CreateDateColumn, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PaymentStatus {
  PENDING   = 'pending',
  COMPLETED = 'completed',
  FAILED    = 'failed',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  agentId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: User;

  @Column({ type: 'varchar', nullable: true })
  subscriptionId: string | null;

  @Column('int')
  amount: number; // en FCFA

  @Column({ default: 'XOF' })
  currency: string;

  @Column({ type: 'varchar', default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'varchar', nullable: true })
  paydunyaToken: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
