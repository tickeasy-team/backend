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
import { Order } from './order.js';

// --- 新增 PaymentStatus ---
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
// -------------------------

@Entity('payment')
export class Payment {
  @PrimaryGeneratedColumn('uuid', { name: 'paymentId' })
  paymentId: string;

  @Column({ name: 'orderId', nullable: false })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ length: 50, nullable: false })
  method: string;

  @Column({ length: 50, nullable: true })
  provider: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'completed', 'failed', 'refunded'] as PaymentStatus[],
    nullable: false
  })
  status: PaymentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  amount: number;

  @Column({ length: 10, default: 'TWD' })
  currency: string;

  @Column({ nullable: true })
  paidAt: Date;

  @Column({ length: 100, unique: true, nullable: true })
  transactionId: string;

  @Column({ type: 'jsonb', nullable: true })
  rawPayload: object;

  @CreateDateColumn({ nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;
} 