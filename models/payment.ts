/**
 * 支付模型
 */
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Order } from './order';

@Entity('payment')
export class Payment {
  @PrimaryGeneratedColumn('uuid', { name: 'paymentId' })
  paymentId: string;

  @Column({ name: 'orderId' })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ length: 50 })
  method: string;

  @Column({ length: 50, nullable: true })
  provider: string;

  @Column({ length: 20 })
  status: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 10, default: 'TWD' })
  currency: string;

  @Column({ nullable: true })
  paidAt: Date;

  @Column({ length: 100, nullable: true })
  transactionId: string;

  @Column({ type: 'jsonb', nullable: true })
  rawPayload: object;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ nullable: false, default: () => 'now()' })
  updatedAt: Date;
} 