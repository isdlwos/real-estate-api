import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PropertyType } from '../../../common/enums/property-type.enum';
import { PropertyCategory } from '../../../common/enums/property-category.enum';
import { PropertyStatus } from '../../../common/enums/property-status.enum';
import { Agent } from '../../users/entities/agent.entity';
import { PropertyImage } from '../../property-images/entities/property-image.entity';
import { PropertyTour } from '../../property-tours/entities/property-tour.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Favorite } from '../../favorites/entities/favorite.entity';

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'enum', enum: PropertyType })
  type: PropertyType;

  @Column({ type: 'enum', enum: PropertyCategory })
  category: PropertyCategory;

  @Column({ type: 'enum', enum: PropertyStatus, default: PropertyStatus.DRAFT })
  status: PropertyStatus;

  @Column({ type: 'float', nullable: true })
  surface: number;

  @Column({ nullable: true })
  rooms: number;

  @Column({ nullable: true })
  bedrooms: number;

  @Column({ nullable: true })
  bathrooms: number;

  @Column()
  address: string;

  @Column()
  city: string;

  @Column({ nullable: true })
  zipCode: string;

  @Column({ default: 'France' })
  country: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ type: 'jsonb', nullable: true })
  features: Record<string, unknown>;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  contactCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  boostedUntil: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  featuredUntil: Date | null;

  @Column({ nullable: true })
  agentId: string;

  @ManyToOne(() => Agent, (agent) => agent.properties, { nullable: true })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @OneToMany(() => PropertyImage, (img) => img.property, { cascade: true })
  images: PropertyImage[];

  @OneToMany(() => PropertyTour, (tour) => tour.property, { cascade: true })
  tours: PropertyTour[];

  @OneToMany(() => Appointment, (appt) => appt.property)
  appointments: Appointment[];

  @OneToMany(() => Favorite, (fav) => fav.property)
  favorites: Favorite[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
