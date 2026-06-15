import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Agent } from '../../users/entities/agent.entity';
import { Property } from '../../properties/entities/property.entity';

export enum TransactionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface TransactionStep {
  id: string;
  label: string;
  completedAt: string | null;
}

export const DEFAULT_STEPS: TransactionStep[] = [
  { id: 'contact',      label: 'Premier contact établi',            completedAt: null },
  { id: 'virtual_tour', label: 'Visite virtuelle 360° réalisée',    completedAt: null },
  { id: 'documents',    label: 'Documents du bien vérifiés',        completedAt: null },
  { id: 'offer',        label: 'Offre soumise et acceptée',         completedAt: null },
  { id: 'compromise',   label: 'Compromis de vente signé',          completedAt: null },
  { id: 'notary',       label: 'Vérification notariale effectuée',  completedAt: null },
  { id: 'financing',    label: 'Financement confirmé',              completedAt: null },
  { id: 'deed',         label: 'Acte de vente signé',               completedAt: null },
  { id: 'keys',         label: 'Remise des clés',                   completedAt: null },
];

@Entity('diaspora_transactions')
export class DiasporaTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  agentId: string;

  @Column({ type: 'varchar', nullable: true })
  propertyId: string | null;

  @Column()
  clientName: string;

  @Column()
  clientEmail: string;

  @Column({ type: 'varchar', nullable: true })
  clientPhone: string | null;

  @Column({ type: 'varchar', nullable: true })
  clientCountry: string | null;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.ACTIVE })
  status: TransactionStatus;

  @Column({ type: 'jsonb' })
  steps: TransactionStep[];

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @ManyToOne(() => Property, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
