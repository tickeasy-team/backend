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

@Entity('ticket')
export class Ticket {
  @PrimaryGeneratedColumn('uuid', { name: 'ticketId' })
  ticketId: string;

  @Column({ name: 'orderId' })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ name: 'ticketTypeId' })
  ticketTypeId: string;

  @ManyToOne(() => TicketType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketTypeId' })
  ticketType: TicketType;

  @Column({ name: 'userId', nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 100, nullable: true })
  purchaserName: string;

  @Column({ length: 100, nullable: true })
  purchaserEmail: string;

  @Column({ type: 'timestamp' })
  concertStartTime: Date;

  @Column({ length: 20, nullable: true })
  seatNumber: string;

  @Column({ length: 255, nullable: true })
  qrCode: string;

  @Column({ length: 20 })
  status: string;

  @CreateDateColumn({ name: 'purchaseTime' })
  purchaseTime: Date;
} 