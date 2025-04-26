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
import { Concert } from './concert';
import { Order } from './order';
import { Ticket } from './ticket';

@Entity('ticketType')
export class TicketType {
  @PrimaryGeneratedColumn('uuid', { name: 'ticketTypeId' })
  ticketTypeId: string;

  @Column({ name: 'concertId' })
  concertId: string;

  @ManyToOne(() => Concert, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'concertId' })
  concert: Concert;

  @Column({ length: 50 })
  ticketTypeName: string;

  @Column({ length: 50, nullable: true })
  entranceType: string;

  @Column({ type: 'text', nullable: true })
  ticketBenefits: string;

  @Column({ type: 'text', nullable: true })
  ticketRefundPolicy: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  ticketTypePrice: number;

  @Column()
  totalQuantity: number;

  @Column()
  remainingQuantity: number;

  @Column({ type: 'timestamp', nullable: true })
  sellBeginDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  sellEndDate: Date;

  @CreateDateColumn()
  createdAt: Date;
  
  @OneToMany(() => Order, order => order.ticketType)
  orders: Order[];
  
  @OneToMany(() => Ticket, ticket => ticket.ticketType)
  tickets: Ticket[];
} 