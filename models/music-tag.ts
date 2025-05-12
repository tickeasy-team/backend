/**
 * 音樂類型標籤模型
 */
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  OneToMany
} from 'typeorm';
import { Concert } from './concert';

@Entity('musicTag')
export class MusicTag {
  @PrimaryGeneratedColumn('uuid', { name: 'musicTagId' })
  musicTagId: string;

  @Column({ type: 'varchar', length: 50, nullable: false }) // ✅ 明確型別
  musicTagName: string;
  
  @OneToMany(() => Concert, concert => concert.musicTag)
  concerts: Concert[];
} 