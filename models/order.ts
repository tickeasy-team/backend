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

  @Column({ name: 'ticketTypeId', type: 'uuid', nullable: false })
  ticketTypeId: string;

  @ManyToOne(() => TicketType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ticketTypeId' })
  ticketType: TicketType;

  @Column({ name: 'userId', type: 'uuid', nullable: false })
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

  @Column({ type: 'boolean', default: true, nullable: false })
  isLocked: boolean;

  @Column({ type: 'varchar', length: 100, nullable: false })
  lockToken: string;

  @Column({ type: 'timestamp', nullable: false })
  lockExpireTime: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  purchaserName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  purchaserEmail: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  purchaserPhone: string;

  @Column({ type: 'varchar', nullable: true })
  invoicePlatform: string;

  @Column({ type: 'varchar', nullable: true })
  invoiceType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  invoiceCarrier: string;

  @Column({ type: 'varchar', nullable: true })
  invoiceStatus: string;

  @Column({ type: 'varchar', nullable: true })
  invoiceNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
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