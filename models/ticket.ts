/**
 * 票券模型
 */
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne,
  JoinColumn,
  CreateDateColumn
} from 'typeorm';
import { Order } from './order';
import { TicketType } from './ticket-type';
import { User } from './user';

// --- 新增 TicketStatus ---
export type TicketStatus = 'purchased' | 'refunded' | 'used';
// ------------------------

@Entity('ticket')
export class Ticket {
  @PrimaryGeneratedColumn('uuid', { name: 'ticketId' })
  ticketId: string;

  @Column({ name: 'orderId', nullable: false })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ name: 'ticketTypeId', nullable: false })
  ticketTypeId: string;

  @ManyToOne(() => TicketType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ticketTypeId' })
  ticketType: TicketType;

  @Column({ name: 'userId', nullable: false })
  userId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 100, nullable: true })
  purchaserName: string;

  @Column({ length: 100, nullable: true })
  purchaserEmail: string;

  @Column({ type: 'timestamp', nullable: false })
  concertStartTime: Date;

  @Column({ nullable: true })
  seatNumber: string;

  @Column({ length: 255, unique: true, nullable: true })
  qrCode: string;

  @Column({
    type: 'enum',
    enum: ['purchased', 'refunded', 'used'] as TicketStatus[],
    nullable: false
  })
  status: TicketStatus;

  @Column({ type: 'timestamp', name: 'purchaseTime', nullable: false })
  purchaseTime: Date;
} 