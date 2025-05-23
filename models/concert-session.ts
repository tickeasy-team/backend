/**
 * 音樂會場次模型
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { TicketType } from './ticket-type';
import { Concert } from './concert';

// export type SessionStatus = 'draft' | 'published' | 'finished';

@Entity('concertSession')
export class ConcertSession {
  @PrimaryGeneratedColumn('uuid', { name: 'sessionId' })
  sessionId: string;

  @Column({ name: 'concertId', type: 'uuid', nullable: false })
  concertId: string;

  @ManyToOne(() => Concert, (concert) => concert.sessions, {
    nullable: false,
    onDelete: 'CASCADE', // 刪除音樂會時也刪掉場次
  })
  @JoinColumn({ name: 'concertId' })
  concert: Concert;

  @OneToMany(() => TicketType, (ticketType) => ticketType.concertSession, {
    cascade: true, // 建立 session 時可同時建立 ticketTypes
  })
  ticketTypes: TicketType[];

  @Column({ type: 'date', nullable: true })
  sessionDate: Date;

  @Column({ type: 'time', nullable: true })
  sessionStart: string;

  @Column({ type: 'time', nullable: true })
  sessionEnd: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sessionTitle: string;

  @Column({ type: 'json', nullable: true })
  imgSeattable: any;

  @CreateDateColumn()
  createdAt: Date;
}
