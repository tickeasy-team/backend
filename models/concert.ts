/**
 * 音樂會模型
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Organization } from './organization.js';
import { Venue } from './venue.js';
import { LocationTag } from './location-tag.js';
import { MusicTag } from './music-tag.js';
import { ConcertSession } from './concert-session.js';
// import { TicketType } from './ticket-type.js';

export type ConInfoStatus = 'draft' | 'published' | 'finished';

/* eslint-disable no-unused-vars */
export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SKIPPED = 'skipped',
}

@Entity('concert')
export class Concert {
  @PrimaryGeneratedColumn('uuid', { name: 'concertId' })
  concertId: string;

  @Column({ name: 'organizationId', type: 'uuid', nullable: false })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ name: 'venueId', type: 'uuid', nullable: true })
  venueId: string;

  @ManyToOne(() => Venue, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  @Column({ name: 'locationTagId', type: 'uuid', nullable: true })
  locationTagId: string;

  @ManyToOne(() => LocationTag, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'locationTagId' })
  locationTag: LocationTag;

  @Column({ name: 'musicTagId', type: 'uuid', nullable: true })
  musicTagId: string;

  @ManyToOne(() => MusicTag, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'musicTagId' })
  musicTag: MusicTag;

  @Column({ type: 'varchar', length: 50, nullable: false })
  conTitle: string;

  @Column({ type: 'varchar', length: 3000, nullable: true })
  conIntroduction: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  conLocation: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  conAddress: string;

  @Column({ type: 'date', nullable: true })
  eventStartDate: Date;

  @Column({ type: 'date', nullable: true })
  eventEndDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imgBanner: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  ticketPurchaseMethod: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  precautions: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  refundPolicy: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'finished'] as ConInfoStatus[],
    default: 'draft',
    nullable: false,
  })
  conInfoStatus: ConInfoStatus;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.SKIPPED,
  })
  reviewStatus: ReviewStatus;

  @Column({ type: 'int', default: 0 })
  visitCount: number; // 參觀人數

  @Column({ type: 'int', nullable: true })
  promotion: number; // 權重數字

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => ConcertSession, (session) => session.concert, {
    cascade: true, // 建立 Concert 時自動建立 sessions
    onDelete: 'CASCADE', // 刪除會連動刪除
    eager: true, // 取資料時會自動帶入
  })
  sessions: ConcertSession[];

  // @OneToMany(() => TicketType, ticketType => ticketType.concert)
  // ticketTypes: TicketType[];

  // @Column({ type: 'varchar', length: 255, nullable: false })
  // imgSeattable: string;
}
