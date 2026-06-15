import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Subscription } from './subscription.entity';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string; // starter | pro | agency

  @Column('int')
  price: number; // en FCFA

  @Column('int')
  maxListings: number; // -1 = illimité

  @Column({ default: false })
  canBoost: boolean;

  @Column({ default: false })
  canFeature: boolean;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Subscription, (s) => s.plan)
  subscriptions: Subscription[];
}
