/**
 * 票種模型
 */
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany
} from 'typeorm';
// import { Concert } from './concert.js';
import { Order } from './order.js';
import { Ticket } from './ticket.js';
import { ConcertSession } from './concert-session.js';

@Entity('ticketType')
export class TicketType {
  @PrimaryGeneratedColumn('uuid', { name: 'ticketTypeId' })
  ticketTypeId: string;

  @Column({ name: 'concertSessionId', type: 'uuid', nullable: false })
  concertSessionId: string;

  @ManyToOne(() => ConcertSession, (session) => session.ticketTypes)
  @JoinColumn({ name: 'concertSessionId' })
  concertSession: ConcertSession;

  @Column({ type: 'varchar', length: 50, nullable: false })
  ticketTypeName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  entranceType: string;

  @Column({ type: 'text', nullable: true })
  ticketBenefits: string;

  @Column({ type: 'text', nullable: true })
  ticketRefundPolicy: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  ticketTypePrice: number;

  @Column({ type: 'int', nullable: false })
  totalQuantity: number;

  @Column({ type: 'int', nullable: false })
  remainingQuantity: number;

  @Column({ type: 'timestamp', nullable: true })
  sellBeginDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  sellEndDate: Date;

  @CreateDateColumn({ nullable: false })
  createdAt: Date;
  
  @OneToMany(() => Order, order => order.ticketType)
  orders: Order[];
  
  @OneToMany(() => Ticket, ticket => ticket.ticketType)
  tickets: Ticket[];
} 