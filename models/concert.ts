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
import { Organization } from './organization';
import { Venue } from './venue';
import { LocationTag } from './location-tag';
import { MusicTag } from './music-tag';
import { ConcertSession } from './concert-session';
import { TicketType } from './ticket-type';

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

  @Column({ name: 'organizationId', type: 'uuid', nullable: false })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ name: 'venueId', type: 'uuid', nullable: false })
  venueId: string;

  @ManyToOne(() => Venue, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  @Column({ name: 'locationTagId', type: 'uuid', nullable: false })
  locationTagId: string;

  @ManyToOne(() => LocationTag, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'locationTagId' })
  locationTag: LocationTag;

  @Column({ name: 'musicTagId', type: 'uuid', nullable: false })
  musicTagId: string;

  @ManyToOne(() => MusicTag, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'musicTagId' })
  musicTag: MusicTag;

  @Column({ type: 'varchar', length: 50, nullable: false })
  conTitle: string;

  @Column({ type: 'varchar', length: 3000, nullable: true })
  conIntroduction: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  conLocation: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  conAddress: string;

  @Column({ type: 'date', nullable: true })
  eventStartDate: Date;

  @Column({ type: 'date', nullable: true })
  eventEndDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: false })
  imgBanner: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  imgSeattable: string;

  @Column({ type: 'varchar', length: 1000, nullable: false })
  ticketPurchaseMethod: string;

  @Column({ type: 'varchar', length: 2000, nullable: false })
  precautions: string;

  @Column({ type: 'varchar', length: 1000, nullable: false })
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

  @Column({ type: 'int', default: 0 })
  visitCount: number;

  @Column({ type: 'int', nullable: true })
  promotion: number;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => ConcertSession, session => session.concert)
  sessions: ConcertSession[];

  @OneToMany(() => TicketType, ticketType => ticketType.concert)
  ticketTypes: TicketType[];
} 