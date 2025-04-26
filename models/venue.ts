/**
 * 場地模型
 */
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from 'typeorm';
import { Concert } from './concert';

@Entity('venues')
export class Venue {
  @PrimaryGeneratedColumn('uuid', { name: 'venueId' })
  venueId: string;

  @Column({ length: 100 })
  venueName: string;

  @Column({ type: 'text', nullable: true })
  venueDescription: string;

  @Column({ length: 200 })
  venueAddress: string;

  @Column({ nullable: true })
  venueCapacity: number;

  @Column({ length: 255, nullable: true })
  venueImageUrl: string;

  @Column({ length: 255, nullable: true })
  googleMapUrl: string;

  @Column({ default: false })
  isAccessible: boolean;

  @Column({ default: false })
  hasParking: boolean;

  @Column({ default: false })
  hasTransit: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  
  @OneToMany(() => Concert, concert => concert.venue)
  concerts: Concert[];
} 