/**
 * 訂單模型
 */
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany
} from 'typeorm';
import { User } from './user';
import { TicketType } from './ticket-type';
import { Ticket } from './ticket';
import { Payment } from './payment';

// --- 新增 OrderStatus ---
export type OrderStatus = 'held' | 'expired' | 'paid' | 'cancelled' | 'refunded';
// -----------------------

@Entity('order')
export class Order {
  @PrimaryGeneratedColumn('uuid', { name: 'orderId' })
  orderId: string;

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

  @Column({
    type: 'enum',
    enum: ['held', 'expired', 'paid', 'cancelled', 'refunded'] as OrderStatus[],
    nullable: false
  })
  orderStatus: OrderStatus;

  @Column({ default: true, nullable: false })
  isLocked: boolean;

  @Column({ length: 100, nullable: false })
  lockToken: string;

  @Column({ nullable: false })
  lockExpireTime: Date;

  @Column({ length: 50, nullable: true })
  purchaserName: string;

  @Column({ length: 100, nullable: true })
  purchaserEmail: string;

  @Column({ length: 50, nullable: true })
  purchaserPhone: string;

  @Column({ nullable: true })
  invoicePlatform: string;

  @Column({ nullable: true })
  invoiceType: string;

  @Column({ length: 100, nullable: true })
  invoiceCarrier: string;

  @Column({ nullable: true })
  invoiceStatus: string;

  @Column({ nullable: true })
  invoiceNumber: string;

  @Column({ length: 255, nullable: true })
  invoiceUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;
  
  @OneToMany(() => Ticket, ticket => ticket.order)
  tickets: Ticket[];
  
  @OneToMany(() => Payment, payment => payment.order)
  payments: Payment[];
} 