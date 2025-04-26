/**
 * 用戶模型
 * 
 * 使用 TypeORM 的裝飾器語法定義實體和屬性
 */

import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
  BeforeInsert,
  BeforeUpdate
} from 'typeorm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Ticket } from './ticket';
import { Order } from './order';
import { Organization } from './organization';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPERUSER = 'superuser'
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other'
}

// OAuth Provider 介面定義
export interface OAuthProvider {
  provider: string;
  providerId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: Date;
}

// 搜尋歷史項目介面
export interface SearchHistoryItem {
  query: string;
  timestamp: Date;
  category?: string;
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'userId' })
  userId: string;

  // 別名以兼容舊代碼
  get id(): string {
    return this.userId;
  }

  @Column({ length: 100, unique: true, nullable: false })
  @Index()
  email: string;

  @Column({ length: 60, nullable: true, select: false })
  password: string;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 20, nullable: true })
  nickname: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  @Index()
  role: UserRole;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ type: 'date', nullable: true })
  birthday: Date;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true
  })
  gender: Gender;

  @Column('varchar', { array: true, nullable: true, default: '{}' })
  preferredRegions: string[];

  @Column('varchar', { array: true, nullable: true, default: '{}' })
  preferredEventTypes: string[];

  @Column({ length: 20, nullable: true })
  country: string;

  @Column({ length: 100, nullable: true })
  address: string;

  @Column({ length: 255, nullable: true })
  avatar: string;

  @Column({ length: 50, nullable: true })
  verificationToken: string;

  @Column({ nullable: true })
  verificationTokenExpires: Date;

  @Column({ default: false, nullable: false })
  isEmailVerified: boolean;

  @Column({ length: 50, nullable: true })
  passwordResetToken: string;

  @Column({ nullable: true })
  passwordResetExpires: Date;

  @Column({ nullable: true })
  lastVerificationAttempt: Date;

  @Column({ nullable: true })
  lastPasswordResetAttempt: Date;

  @Column('jsonb', { default: '[]', nullable: false })
  oauthProviders: OAuthProvider[];

  @Column('jsonb', { default: '[]', nullable: true })
  searchHistory: SearchHistoryItem[];

  @CreateDateColumn({ nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ nullable: false })
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;

  @OneToMany(() => Ticket, ticket => ticket.user)
  tickets: Ticket[];

  @OneToMany(() => Order, order => order.user)
  orders: Order[];

  @OneToMany(() => Organization, organization => organization.user)
  organizations: Organization[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }
  
  /**
   * 比較密碼
   * @param candidatePassword 候選密碼
   * @returns 密碼是否匹配
   */
  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
  
  /**
   * 創建驗證碼
   * @returns 驗證碼和令牌
   */
  async createVerificationToken(): Promise<{ token: string; code: string }> {
    // 生成6位數驗證碼
    const code = Array(6).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
    
    // 存儲驗證碼和過期時間
    this.verificationToken = code;
    this.verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10分鐘
    this.lastVerificationAttempt = new Date();
    
    return { token: '', code };
  }
  
  /**
   * 創建密碼重置碼
   * @returns 密碼重置碼和令牌
   */
  async createPasswordResetToken(): Promise<{ token: string; code: string }> {
    // 生成6位數重置碼
    const code = Array(6).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
    
    // 存儲重置碼和過期時間
    this.passwordResetToken = code;
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10分鐘
    this.lastPasswordResetAttempt = new Date();
    
    return { token: '', code };
  }
} 