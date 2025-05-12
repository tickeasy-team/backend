/**
 * 組織/公司模型
 */
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { User } from './user';

@Entity('organization')
export class Organization {
  @PrimaryGeneratedColumn('uuid', { name: 'organizationId' })
  organizationId: string;

  @Column({ name: 'userId', type: 'uuid', nullable: false })
  userId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  orgName: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  orgAddress: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  orgMail: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  orgContact: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  orgMobile: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  orgPhone: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  orgWebsite: string;

  @CreateDateColumn()
  createdAt: Date;
} 