# 資料模型實作

## 概述
本文檔詳細說明 Tickeasy 票務系統中所有資料模型的實作，包括實體類別定義、欄位驗證、裝飾器使用以及資料轉換等關鍵內容。

## 基礎實體類別

### 1. 抽象基礎實體
```typescript
// src/models/BaseEntity.ts
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  BaseEntity as TypeORMBaseEntity,
} from 'typeorm';
import { IsDate, IsUUID } from 'class-validator';
import { Exclude, Transform } from 'class-transformer';

export abstract class BaseEntity extends TypeORMBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @IsDate()
  @Transform(({ value }) => value?.toISOString())
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  @IsDate()
  @Transform(({ value }) => value?.toISOString())
  updatedAt: Date;

  @DeleteDateColumn({
    type: 'timestamp with time zone',
    nullable: true,
  })
  @IsDate()
  @Exclude()
  deletedAt?: Date;
}
```

## 用戶相關模型

### 1. 用戶實體
```typescript
// src/models/User.ts
import {
  Entity,
  Column,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsEmail,
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsPhoneNumber,
  Length,
  Matches,
} from 'class-validator';
import { Exclude, Transform } from 'class-transformer';
import { BaseEntity } from './BaseEntity';
import { Organization } from './Organization';
import { Concert } from './Concert';
import { Order } from './Order';

export enum UserRole {
  USER = 'user',
  ORGANIZER = 'organizer',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['username'], { unique: true })
@Index(['role'])
@Index(['status'])
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  @IsEmail({}, { message: '電子郵件格式不正確' })
  @Transform(({ value }) => value?.toLowerCase())
  email: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @IsString({ message: '用戶名必須是字串' })
  @Length(3, 100, { message: '用戶名長度必須在 3-100 字元之間' })
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: '用戶名僅能包含字母、數字、底線和連字號' })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  @IsString()
  @Exclude({ toPlainOnly: true })
  passwordHash: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString({ message: '名字必須是字串' })
  @Length(1, 100, { message: '名字長度不能超過 100 字元' })
  firstName?: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString({ message: '姓氏必須是字串' })
  @Length(1, 100, { message: '姓氏長度不能超過 100 字元' })
  lastName?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  @IsOptional()
  @IsPhoneNumber('TW', { message: '手機號碼格式不正確' })
  phone?: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  @IsBoolean()
  emailVerified: boolean;

  @Column({ name: 'phone_verified', type: 'boolean', default: false })
  @IsBoolean()
  phoneVerified: boolean;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsEnum(UserRole, { message: '用戶角色不正確' })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  @IsEnum(UserStatus, { message: '用戶狀態不正確' })
  status: UserStatus;

  @Column({ name: 'last_login_at', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  lastLoginAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  preferences?: Record<string, any>;

  // 關聯關係
  @OneToMany(() => Organization, (organization) => organization.owner)
  ownedOrganizations: Organization[];

  @ManyToOne(() => Organization, (organization) => organization.members, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @OneToMany(() => Concert, (concert) => concert.organizer)
  organizedConcerts: Concert[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  // 虛擬屬性
  get fullName(): string {
    return [this.firstName, this.lastName].filter(Boolean).join(' ');
  }

  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  get isOrganizer(): boolean {
    return this.role === UserRole.ORGANIZER || this.role === UserRole.ADMIN;
  }

  get isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }
}
```

### 2. 組織實體
```typescript
// src/models/Organization.ts
import {
  Entity,
  Column,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsString,
  IsEmail,
  IsBoolean,
  IsOptional,
  IsUrl,
  Length,
} from 'class-validator';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { Concert } from './Concert';

@Entity('organizations')
@Index(['name'])
@Index(['verified'])
export class Organization extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  @IsString({ message: '組織名稱必須是字串' })
  @Length(1, 200, { message: '組織名稱長度必須在 1-200 字元之間' })
  name: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: '組織描述必須是字串' })
  description?: string;

  @Column({ name: 'website_url', type: 'text', nullable: true })
  @IsOptional()
  @IsUrl({}, { message: '網站網址格式不正確' })
  websiteUrl?: string;

  @Column({ name: 'contact_email', type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsEmail({}, { message: '聯絡信箱格式不正確' })
  contactEmail?: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 20, nullable: true })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Logo 網址格式不正確' })
  logoUrl?: string;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  verified: boolean;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  metadata?: Record<string, any>;

  // 關聯關係
  @ManyToOne(() => User, (user) => user.ownedOrganizations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => User, (user) => user.organization)
  members: User[];

  @OneToMany(() => Concert, (concert) => concert.organization)
  concerts: Concert[];

  // 虛擬屬性
  get isVerified(): boolean {
    return this.verified;
  }
}
```

## 演唱會相關模型

### 1. 場地實體
```typescript
// src/models/Venue.ts
import {
  Entity,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import {
  IsString,
  IsNumber,
  IsPositive,
  Length,
  IsOptional,
} from 'class-validator';
import { BaseEntity } from './BaseEntity';
import { Concert } from './Concert';

@Entity('venues')
@Index(['city'])
@Index(['country'])
export class Venue extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  @IsString({ message: '場地名稱必須是字串' })
  @Length(1, 200, { message: '場地名稱長度必須在 1-200 字元之間' })
  name: string;

  @Column({ type: 'text' })
  @IsString({ message: '地址必須是字串' })
  address: string;

  @Column({ type: 'varchar', length: 100 })
  @IsString({ message: '城市必須是字串' })
  @Length(1, 100, { message: '城市名稱長度不能超過 100 字元' })
  city: string;

  @Column({ type: 'varchar', length: 100 })
  @IsString({ message: '國家必須是字串' })
  @Length(1, 100, { message: '國家名稱長度不能超過 100 字元' })
  country: string;

  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @Column({ type: 'integer' })
  @IsNumber({}, { message: '容量必須是數字' })
  @IsPositive({ message: '容量必須大於 0' })
  capacity: number;

  @Column({ type: 'jsonb', default: '{}' })
  @IsOptional()
  facilities?: Record<string, any>;

  @Column({ name: 'contact_info', type: 'jsonb', default: '{}' })
  @IsOptional()
  contactInfo?: Record<string, any>;

  // 關聯關係
  @OneToMany(() => Concert, (concert) => concert.venue)
  concerts: Concert[];

  // 虛擬屬性
  get fullAddress(): string {
    return [this.address, this.city, this.country].join(', ');
  }

  get hasParking(): boolean {
    return this.facilities?.parking === true;
  }
}
```

### 2. 演唱會實體
```typescript
// src/models/Concert.ts
import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import {
  IsString,
  IsEnum,
  IsDate,
  IsOptional,
  IsUrl,
  Length,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { Organization } from './Organization';
import { Venue } from './Venue';
import { ConcertSession } from './ConcertSession';
import { TicketType } from './TicketType';

export enum ConcertStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('concerts')
@Index(['title'])
@Index(['artist_name'])
@Index(['start_date'])
@Index(['status'])
export class Concert extends BaseEntity {
  @Column({ type: 'varchar', length: 300 })
  @IsString({ message: '演唱會標題必須是字串' })
  @Length(1, 300, { message: '演唱會標題長度必須在 1-300 字元之間' })
  title: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: '演唱會描述必須是字串' })
  description?: string;

  @Column({ name: 'artist_name', type: 'varchar', length: 200 })
  @IsString({ message: '藝人名稱必須是字串' })
  @Length(1, 200, { message: '藝人名稱長度必須在 1-200 字元之間' })
  artistName: string;

  @Column({ name: 'start_date', type: 'timestamp with time zone' })
  @IsDate({ message: '開始日期必須是有效日期' })
  @Type(() => Date)
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp with time zone' })
  @IsDate({ message: '結束日期必須是有效日期' })
  @Type(() => Date)
  endDate: Date;

  @Column({ name: 'poster_url', type: 'text', nullable: true })
  @IsOptional()
  @IsUrl({}, { message: '海報網址格式不正確' })
  posterUrl?: string;

  @Column({
    type: 'enum',
    enum: ConcertStatus,
    default: ConcertStatus.DRAFT,
  })
  @IsEnum(ConcertStatus, { message: '演唱會狀態不正確' })
  status: ConcertStatus;

  @Column({ type: 'jsonb', default: '[]' })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => value || [])
  tags?: string[];

  @Column({ type: 'jsonb', default: '{}' })
  @IsOptional()
  metadata?: Record<string, any>;

  // 關聯關係
  @ManyToOne(() => Venue, (venue) => venue.concerts, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => User, (user) => user.organizedConcerts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizer_id' })
  organizer: User;

  @ManyToOne(() => Organization, (organization) => organization.concerts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => ConcertSession, (session) => session.concert, { cascade: true })
  sessions: ConcertSession[];

  @OneToMany(() => TicketType, (ticketType) => ticketType.concert, { cascade: true })
  ticketTypes: TicketType[];

  // 虛擬屬性
  get isPublished(): boolean {
    return this.status === ConcertStatus.PUBLISHED;
  }

  get isCancelled(): boolean {
    return this.status === ConcertStatus.CANCELLED;
  }

  get isCompleted(): boolean {
    return this.status === ConcertStatus.COMPLETED;
  }

  get duration(): number {
    return this.endDate.getTime() - this.startDate.getTime();
  }

  get durationInHours(): number {
    return Math.round(this.duration / (1000 * 60 * 60));
  }
}
```

### 3. 演唱會場次實體
```typescript
// src/models/ConcertSession.ts
import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import {
  IsString,
  IsEnum,
  IsDate,
  IsOptional,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BaseEntity } from './BaseEntity';
import { Concert } from './Concert';
import { Ticket } from './Ticket';

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('concert_sessions')
@Index(['start_time'])
@Index(['status'])
export class ConcertSession extends BaseEntity {
  @Column({ name: 'session_name', type: 'varchar', length: 200, nullable: true })
  @IsOptional()
  @IsString({ message: '場次名稱必須是字串' })
  @Length(1, 200, { message: '場次名稱長度不能超過 200 字元' })
  sessionName?: string;

  @Column({ name: 'start_time', type: 'timestamp with time zone' })
  @IsDate({ message: '開始時間必須是有效日期' })
  @Type(() => Date)
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp with time zone' })
  @IsDate({ message: '結束時間必須是有效日期' })
  @Type(() => Date)
  endTime: Date;

  @Column({ name: 'doors_open_time', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate({ message: '開門時間必須是有效日期' })
  @Type(() => Date)
  doorsOpenTime?: Date;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.SCHEDULED,
  })
  @IsEnum(SessionStatus, { message: '場次狀態不正確' })
  status: SessionStatus;

  // 關聯關係
  @ManyToOne(() => Concert, (concert) => concert.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'concert_id' })
  concert: Concert;

  @OneToMany(() => Ticket, (ticket) => ticket.concertSession)
  tickets: Ticket[];

  // 虛擬屬性
  get displayName(): string {
    return this.sessionName || `${this.startTime.toLocaleDateString()} 場次`;
  }

  get isUpcoming(): boolean {
    return this.status === SessionStatus.SCHEDULED && this.startTime > new Date();
  }

  get isOngoing(): boolean {
    return this.status === SessionStatus.ONGOING;
  }

  get duration(): number {
    return this.endTime.getTime() - this.startTime.getTime();
  }
}
```

## 票務相關模型

### 1. 票種實體
```typescript
// src/models/TicketType.ts
import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import {
  IsString,
  IsNumber,
  IsPositive,
  IsDate,
  IsOptional,
  IsArray,
  Length,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BaseEntity } from './BaseEntity';
import { Concert } from './Concert';
import { Ticket } from './Ticket';

@Entity('ticket_types')
@Index(['concert_id'])
@Index(['sale_start_time'])
@Index(['sale_end_time'])
export class TicketType extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  @IsString({ message: '票種名稱必須是字串' })
  @Length(1, 200, { message: '票種名稱長度必須在 1-200 字元之間' })
  name: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: '票種描述必須是字串' })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: '價格必須是有效數字' })
  @IsPositive({ message: '價格必須大於 0' })
  @Transform(({ value }) => parseFloat(value))
  price: number;

  @Column({ type: 'varchar', length: 3, default: 'TWD' })
  @IsString()
  @Length(3, 3, { message: '貨幣代碼必須是 3 個字元' })
  currency: string;

  @Column({ name: 'total_quantity', type: 'integer' })
  @IsNumber({}, { message: '總數量必須是數字' })
  @IsPositive({ message: '總數量必須大於 0' })
  totalQuantity: number;

  @Column({ name: 'available_quantity', type: 'integer' })
  @IsNumber({}, { message: '可用數量必須是數字' })
  @Min(0, { message: '可用數量不能小於 0' })
  availableQuantity: number;

  @Column({ name: 'sale_start_time', type: 'timestamp with time zone' })
  @IsDate({ message: '開售時間必須是有效日期' })
  @Type(() => Date)
  saleStartTime: Date;

  @Column({ name: 'sale_end_time', type: 'timestamp with time zone' })
  @IsDate({ message: '停售時間必須是有效日期' })
  @Type(() => Date)
  saleEndTime: Date;

  @Column({ name: 'max_per_order', type: 'integer', default: 4 })
  @IsNumber({}, { message: '每單限購數量必須是數字' })
  @IsPositive({ message: '每單限購數量必須大於 0' })
  @Max(20, { message: '每單限購數量不能超過 20' })
  maxPerOrder: number;

  @Column({ type: 'jsonb', default: '[]' })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => value || [])
  benefits?: string[];

  @Column({ type: 'jsonb', default: '{}' })
  @IsOptional()
  restrictions?: Record<string, any>;

  // 關聯關係
  @ManyToOne(() => Concert, (concert) => concert.ticketTypes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'concert_id' })
  concert: Concert;

  @OneToMany(() => Ticket, (ticket) => ticket.ticketType)
  tickets: Ticket[];

  // 虛擬屬性
  get soldQuantity(): number {
    return this.totalQuantity - this.availableQuantity;
  }

  get salesRatio(): number {
    return this.totalQuantity > 0 ? this.soldQuantity / this.totalQuantity : 0;
  }

  get isSoldOut(): boolean {
    return this.availableQuantity <= 0;
  }

  get isOnSale(): boolean {
    const now = new Date();
    return now >= this.saleStartTime && now <= this.saleEndTime && !this.isSoldOut;
  }

  get formattedPrice(): string {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: this.currency,
    }).format(this.price);
  }
}
```

### 2. 票券實體
```typescript
// src/models/Ticket.ts
import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsString,
  IsEnum,
  IsDate,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BaseEntity } from './BaseEntity';
import { TicketType } from './TicketType';
import { ConcertSession } from './ConcertSession';
import { OrderItem } from './OrderItem';

export enum TicketStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  SOLD = 'sold',
  USED = 'used',
  CANCELLED = 'cancelled',
}

@Entity('tickets')
@Index(['ticket_type_id'])
@Index(['concert_session_id'])
@Index(['status'])
@Index(['qr_code'], { unique: true })
export class Ticket extends BaseEntity {
  @Column({ name: 'seat_info', type: 'jsonb', default: '{}' })
  @IsOptional()
  seatInfo?: Record<string, any>;

  @Column({ name: 'qr_code', type: 'text', unique: true, nullable: true })
  @IsOptional()
  @IsString()
  qrCode?: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.AVAILABLE,
  })
  @IsEnum(TicketStatus, { message: '票券狀態不正確' })
  status: TicketStatus;

  @Column({ name: 'reserved_until', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate({ message: '保留到期時間必須是有效日期' })
  @Type(() => Date)
  reservedUntil?: Date;

  // 關聯關係
  @ManyToOne(() => TicketType, (ticketType) => ticketType.tickets, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ticket_type_id' })
  ticketType: TicketType;

  @ManyToOne(() => ConcertSession, (session) => session.tickets, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'concert_session_id' })
  concertSession: ConcertSession;

  @OneToOne(() => OrderItem, (orderItem) => orderItem.ticket)
  orderItem?: OrderItem;

  // 虛擬屬性
  get isAvailable(): boolean {
    return this.status === TicketStatus.AVAILABLE;
  }

  get isReserved(): boolean {
    return this.status === TicketStatus.RESERVED;
  }

  get isSold(): boolean {
    return this.status === TicketStatus.SOLD;
  }

  get isUsed(): boolean {
    return this.status === TicketStatus.USED;
  }

  get reservationExpired(): boolean {
    return this.reservedUntil ? new Date() > this.reservedUntil : false;
  }

  get seatNumber(): string {
    return this.seatInfo?.seatNumber || '自由入座';
  }

  get seatSection(): string {
    return this.seatInfo?.section || '';
  }
}
```

## 訂單相關模型

### 1. 訂單實體
```typescript
// src/models/Order.ts
import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsDate,
  IsOptional,
  Length,
  IsPositive,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { OrderItem } from './OrderItem';
import { Payment } from './Payment';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('orders')
@Index(['order_number'], { unique: true })
@Index(['user_id'])
@Index(['status'])
@Index(['created_at'])
export class Order extends BaseEntity {
  @Column({ name: 'order_number', type: 'varchar', length: 50, unique: true })
  @IsString({ message: '訂單編號必須是字串' })
  @Length(1, 50, { message: '訂單編號長度不能超過 50 字元' })
  orderNumber: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: '總金額必須是有效數字' })
  @IsPositive({ message: '總金額必須大於 0' })
  @Transform(({ value }) => parseFloat(value))
  totalAmount: number;

  @Column({ type: 'varchar', length: 3, default: 'TWD' })
  @IsString()
  @Length(3, 3, { message: '貨幣代碼必須是 3 個字元' })
  currency: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  @IsEnum(OrderStatus, { message: '訂單狀態不正確' })
  status: OrderStatus;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  @IsEnum(PaymentStatus, { message: '付款狀態不正確' })
  paymentStatus: PaymentStatus;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  @IsDate({ message: '到期時間必須是有效日期' })
  @Type(() => Date)
  expiresAt: Date;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @Column({ type: 'jsonb', default: '{}' })
  @IsOptional()
  metadata?: Record<string, any>;

  // 關聯關係
  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
  items: OrderItem[];

  @OneToOne(() => Payment, (payment) => payment.order, { cascade: true })
  payment?: Payment;

  // 自動生成訂單編號
  @BeforeInsert()
  generateOrderNumber() {
    if (!this.orderNumber) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 5);
      this.orderNumber = `TKT${timestamp}${random}`.toUpperCase();
    }
  }

  // 虛擬屬性
  get isPending(): boolean {
    return this.status === OrderStatus.PENDING;
  }

  get isConfirmed(): boolean {
    return this.status === OrderStatus.CONFIRMED;
  }

  get isPaid(): boolean {
    return this.status === OrderStatus.PAID;
  }

  get isCancelled(): boolean {
    return this.status === OrderStatus.CANCELLED;
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get formattedTotalAmount(): string {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: this.currency,
    }).format(this.totalAmount);
  }

  get itemCount(): number {
    return this.items?.length || 0;
  }
}
```

### 2. 訂單項目實體
```typescript
// src/models/OrderItem.ts
import {
  Entity,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseEntity } from './BaseEntity';
import { Order } from './Order';
import { Ticket } from './Ticket';

@Entity('order_items')
export class OrderItem extends BaseEntity {
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: '價格必須是有效數字' })
  @IsPositive({ message: '價格必須大於 0' })
  @Transform(({ value }) => parseFloat(value))
  price: number;

  // 關聯關係
  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @OneToOne(() => Ticket, (ticket) => ticket.orderItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  // 虛擬屬性
  get formattedPrice(): string {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
    }).format(this.price);
  }
}
```

### 3. 付款記錄實體
```typescript
// src/models/Payment.ts
import {
  Entity,
  Column,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsDate,
  IsOptional,
  IsPositive,
  Length,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BaseEntity } from './BaseEntity';
import { Order } from './Order';
import { PaymentStatus } from './Order';

@Entity('payments')
@Index(['order_id'])
@Index(['status'])
@Index(['provider_transaction_id'])
export class Payment extends BaseEntity {
  @Column({ name: 'payment_method', type: 'varchar', length: 50 })
  @IsString({ message: '付款方式必須是字串' })
  @Length(1, 50, { message: '付款方式長度不能超過 50 字元' })
  paymentMethod: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: '付款金額必須是有效數字' })
  @IsPositive({ message: '付款金額必須大於 0' })
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'TWD' })
  @IsString()
  @Length(3, 3, { message: '貨幣代碼必須是 3 個字元' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  @IsEnum(PaymentStatus, { message: '付款狀態不正確' })
  status: PaymentStatus;

  @Column({ name: 'provider_transaction_id', type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  providerTransactionId?: string;

  @Column({ name: 'provider_response', type: 'jsonb', default: '{}' })
  @IsOptional()
  providerResponse?: Record<string, any>;

  @Column({ name: 'processed_at', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate({ message: '處理時間必須是有效日期' })
  @Type(() => Date)
  processedAt?: Date;

  // 關聯關係
  @OneToOne(() => Order, (order) => order.payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  // 虛擬屬性
  get isCompleted(): boolean {
    return this.status === PaymentStatus.COMPLETED;
  }

  get isFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }

  get isRefunded(): boolean {
    return this.status === PaymentStatus.REFUNDED;
  }

  get formattedAmount(): string {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: this.currency,
    }).format(this.amount);
  }
}
```

## 資料驗證與轉換

### 1. 自定義驗證器
```typescript
// src/validators/custom-validators.ts
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsAfterDate(property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isAfterDate',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return value instanceof Date && relatedValue instanceof Date && value > relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return `${args.property} must be after ${relatedPropertyName}`;
        },
      },
    });
  };
}

export function IsValidCurrency(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidCurrency',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const validCurrencies = ['TWD', 'USD', 'EUR', 'JPY'];
          return typeof value === 'string' && validCurrencies.includes(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid currency code`;
        },
      },
    });
  };
}
```

### 2. 資料轉換器
```typescript
// src/transformers/data-transformers.ts
import { Transform } from 'class-transformer';

export const ToLowerCase = () => Transform(({ value }) => 
  typeof value === 'string' ? value.toLowerCase() : value
);

export const ToTitleCase = () => Transform(({ value }) => 
  typeof value === 'string' 
    ? value.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
    : value
);

export const ToNumber = () => Transform(({ value }) => {
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? value : num;
  }
  return value;
});

export const ToArray = () => Transform(({ value }) => 
  Array.isArray(value) ? value : (value ? [value] : [])
);
```

## 下一步

完成資料模型實作後，請繼續閱讀：
- [關聯關係設計](./04-relationships.md)
- [資料庫遷移](./05-migrations.md) 