import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Property } from '../../properties/entities/property.entity';

@Entity('property_tours')
export class PropertyTour {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  propertyId: string;

  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  @Column()
  imageUrl: string;

  @Column({ type: 'varchar', nullable: true })
  publicId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Property, (prop) => prop.tours, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property: Property;
}
