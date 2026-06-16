import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../../common/enums/role.enum';
import { Agent } from './agent.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Favorite } from '../../favorites/entities/favorite.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column()
  password: string;

  @Column({ type: 'enum', enum: Role, default: Role.CLIENT })
  role: Role;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  avatar: string;

  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  refreshTokenHash: string | null;

  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  passwordResetToken: string | null;

  @Exclude()
  @Column({ type: 'timestamptz', nullable: true })
  passwordResetExpiry: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Agent, (agent) => agent.user, {
    nullable: true,
    cascade: true,
  })
  agentProfile: Agent;

  @OneToMany(() => Appointment, (appt) => appt.client)
  appointments: Appointment[];

  @OneToMany(() => Favorite, (fav) => fav.user)
  favorites: Favorite[];
}
