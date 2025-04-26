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

  @Column({ name: 'concertId' })
  concertId: string;

  @ManyToOne(() => Concert, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'concertId' })
  concert: Concert;

  @Column({ type: 'date' })
  sessionDate: Date;

  @Column({ type: 'time' })
  sessionStart: string;

  @Column({ type: 'time', nullable: true })
  sessionEnd: string;

  @Column({ length: 100, nullable: true })
  sessionTitle: string;

  @CreateDateColumn()
  createdAt: Date;
} 