import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Property } from '../../properties/entities/property.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true })
  licenseNumber: string;

  @Column({ nullable: true })
  agency: string;

  @Column()
  userId: string;

  @OneToOne(() => User, (user) => user.agentProfile)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Property, (prop) => prop.agent)
  properties: Property[];

  @OneToMany(() => Appointment, (appt) => appt.agent)
  appointments: Appointment[];
}
