import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AppointmentStatus } from '../../../common/enums/appointment-status.enum';
import { Property } from '../../properties/entities/property.entity';
import { Agent } from '../../users/entities/agent.entity';
import { User } from '../../users/entities/user.entity';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp with time zone' })
  date: Date;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column()
  propertyId: string;

  @ManyToOne(() => Property, (prop) => prop.appointments)
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column()
  agentId: string;

  @ManyToOne(() => Agent, (agent) => agent.appointments)
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column()
  clientId: string;

  @ManyToOne(() => User, (user) => user.appointments)
  @JoinColumn({ name: 'clientId' })
  client: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
