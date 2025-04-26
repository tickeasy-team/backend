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

@Entity('order')
export class Order {
  @PrimaryGeneratedColumn('uuid', { name: 'orderId' })
  orderId: string;

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

  @Column({ length: 20 })
  orderStatus: string;

  @Column({ default: true })
  isLocked: boolean;

  @Column({ length: 100 })
  lockToken: string;

  @Column()
  lockExpireTime: Date;

  @Column({ length: 50, nullable: true })
  purchaserName: string;

  @Column({ length: 100, nullable: true })
  purchaserEmail: string;

  @Column({ length: 50, nullable: true })
  purchaserPhone: string;

  @Column({ length: 20, nullable: true })
  invoicePlatform: string;

  @Column({ length: 20, nullable: true })
  invoiceType: string;

  @Column({ length: 100, nullable: true })
  invoiceCarrier: string;

  @Column({ length: 20, nullable: true })
  invoiceStatus: string;

  @Column({ length: 20, nullable: true })
  invoiceNumber: string;

  @Column({ length: 255, nullable: true })
  invoiceUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ nullable: false, default: () => 'now()' })
  updatedAt: Date;
  
  @OneToMany(() => Ticket, ticket => ticket.order)
  tickets: Ticket[];
  
  @OneToMany(() => Payment, payment => payment.order)
  payments: Payment[];
} 