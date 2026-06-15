import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Property } from '../../properties/entities/property.entity';

@Entity('property_images')
export class PropertyImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  url: string;

  @Column({ type: 'varchar', nullable: true })
  publicId: string | null;

  @Column({ default: false })
  isPrimary: boolean;

  @Column()
  propertyId: string;

  @ManyToOne(() => Property, (prop) => prop.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property: Property;
}
