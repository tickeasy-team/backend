/**
 * 音樂會場次模型
 */
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Concert } from './concert';

@Entity('concertSession')
export class ConcertSession {
  @PrimaryGeneratedColumn('uuid', { name: 'sessionId' })
  sessionId: string;

  @Column({ name: 'concertId', type: 'uuid', nullable: false }) // ✅ 加上 type
  concertId: string;

  @ManyToOne(() => Concert, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'concertId' })
  concert: Concert;

  @Column({ type: 'date' })
  sessionDate: Date;

  @Column({ type: 'time' })
  sessionStart: string;

  @Column({ type: 'time', nullable: true })
  sessionEnd: string;

  @Column({ type: 'varchar', length: 100, nullable: true }) // ✅ 加上 type
  sessionTitle: string;
  
  @CreateDateColumn()
  createdAt: Date;
} 