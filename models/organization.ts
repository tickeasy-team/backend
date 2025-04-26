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

  @Column({ name: 'userId' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 100 })
  orgName: string;

  @Column({ length: 100 })
  orgAddress: string;

  @Column({ length: 100, nullable: true })
  orgMail: string;

  @Column({ length: 1000, nullable: true })
  orgContact: string;

  @Column({ length: 200, nullable: true })
  orgMobile: string;

  @Column({ length: 200, nullable: true })
  orgPhone: string;

  @Column({ length: 200, nullable: true })
  orgWebsite: string;

  @CreateDateColumn()
  createdAt: Date;
} 