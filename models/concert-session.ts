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

// 避免直接導入 Concert 類型，使用接口代替
interface ConcertRef {
  concertId: string;
}

@Entity('concertSession')
export class ConcertSession {
  @PrimaryGeneratedColumn('uuid', { name: 'sessionId' })
  sessionId: string;

  @Column({ name: 'concertId', nullable: false })
  concertId: string;

  @ManyToOne('Concert', 'sessions', { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'concertId' })
  concert: ConcertRef;

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