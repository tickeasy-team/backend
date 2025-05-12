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

  @Column({ type: 'varchar', length: 100, nullable: false }) // ✅ 指定 type
  venueName: string;

  @Column({ type: 'text', nullable: true })
  venueDescription: string;

  @Column({ type: 'varchar', length: 200, nullable: false }) // ✅ 指定 type
  venueAddress: string;

  @Column({ type: 'int', nullable: true }) // ✅ 指定 type
  venueCapacity: number;

  @Column({ type: 'varchar', length: 255, nullable: true }) // ✅ 指定 type
  venueImageUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true }) // ✅ 指定 type
  googleMapUrl: string;

  @Column({ type: 'boolean', default: false }) // ✅ 指定 type
  isAccessible: boolean;

  @Column({ type: 'boolean', default: false }) // ✅ 指定 type
  hasParking: boolean;

  @Column({ type: 'boolean', default: false }) // ✅ 指定 type
  hasTransit: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  
  @OneToMany(() => Concert, concert => concert.venue)
  concerts: Concert[];
}