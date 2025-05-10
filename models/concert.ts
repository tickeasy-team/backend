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
  OneToMany
} from 'typeorm';
import { Organization } from './organization.js';
import { Venue } from './venue.js';
import { LocationTag } from './location-tag.js';
import { MusicTag } from './music-tag.js';
import { ConcertSession } from './concert-session.js';
import { TicketType } from './ticket-type.js';

export type ConInfoStatus = 'draft' | 'published' | 'finished';

/* eslint-disable no-unused-vars */
export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SKIPPED = 'skipped'
}

@Entity('concert')
export class Concert {
  @PrimaryGeneratedColumn('uuid', { name: 'concertId' })
  concertId: string;

  @Column({ name: 'organizationId', nullable: false })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ name: 'venueId', nullable: false })
  venueId: string;

  @ManyToOne(() => Venue, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  @Column({ name: 'locationTagId', nullable: false })
  locationTagId: string;

  @ManyToOne(() => LocationTag, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'locationTagId' })
  locationTag: LocationTag;

  @Column({ name: 'musicTagId', nullable: false })
  musicTagId: string;

  @ManyToOne(() => MusicTag, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'musicTagId' })
  musicTag: MusicTag;

  @Column({ length: 50, nullable: false })
  conTitle: string;

  @Column({ length: 3000, nullable: true })
  conIntroduction: string;

  @Column({ length: 50, nullable: false })
  conLocation: string;

  @Column({ length: 200, nullable: false })
  conAddress: string;

  @Column({ type: 'date', nullable: true })
  eventStartDate: Date;

  @Column({ type: 'date', nullable: true })
  eventEndDate: Date;

  @Column({ length: 255, nullable: false })
  imgBanner: string;

  @Column({ length: 255, nullable: false })
  imgSeattable: string;

  @Column({ length: 1000, nullable: false })
  ticketPurchaseMethod: string;

  @Column({ length: 2000, nullable: false })
  precautions: string;

  @Column({ length: 1000, nullable: false })
  refundPolicy: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'finished'] as ConInfoStatus[],
    nullable: true
  })
  conInfoStatus: ConInfoStatus;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.SKIPPED
  })
  reviewStatus: ReviewStatus;

  @Column({ default: 0 })
  visitCount: number;

  @Column({ nullable: true })
  promotion: number;

  @Column({ nullable: true })
  cancelledAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany('ConcertSession', 'concert')
  sessions: ConcertSession[];

  @OneToMany(() => TicketType, ticketType => ticketType.concert)
  ticketTypes: TicketType[];
} 