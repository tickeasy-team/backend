/**
 * 地區標籤模型
 */
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  OneToMany
} from 'typeorm';
import { Concert } from './concert';

@Entity('locationTag')
export class LocationTag {
  @PrimaryGeneratedColumn('uuid', { name: 'locationTagId' })
  locationTagId: string;

  @Column({ type: 'varchar', length: 50, nullable: false }) // ✅ 明確加上 type
  locationTagName: string;
  
  @OneToMany(() => Concert, concert => concert.locationTag)
  concerts: Concert[];
} 