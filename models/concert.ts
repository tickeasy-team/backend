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

  @Column({ name: 'organizationId' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ name: 'venueId', nullable: true })
  venueId: string;

  @ManyToOne(() => Venue, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  @Column({ name: 'locationTagId' })
  locationTagId: string;

  @ManyToOne(() => LocationTag, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'locationTagId' })
  locationTag: LocationTag;

  @Column({ name: 'musicTagId' })
  musicTagId: string;

  @ManyToOne(() => MusicTag, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'musicTagId' })
  musicTag: MusicTag;

  @Column({ length: 50 })
  conTitle: string;

  @Column({ length: 3000, nullable: true })
  conIntroduction: string;

  @Column({ length: 50 })
  conLocation: string;

  @Column({ length: 200 })
  conAddress: string;

  @Column({ type: 'date', nullable: true })
  eventStartDate: Date;

  @Column({ type: 'date', nullable: true })
  eventEndDate: Date;

  @Column({ length: 255 })
  imgBanner: string;

  @Column({ length: 255 })
  imgSeattable: string;

  @Column({ length: 1000 })
  ticketPurchaseMethod: string;

  @Column({ length: 2000 })
  precautions: string;

  @Column({ length: 1000 })
  refundPolicy: string;

  @Column({ length: 10, nullable: true })
  conInfoStatus: string;

  @Column({ length: 10, nullable: true })
  conStatus: string;

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

  @OneToMany(() => ConcertSession, session => session.concert)
  sessions: ConcertSession[];

  @OneToMany(() => TicketType, ticketType => ticketType.concert)
  ticketTypes: TicketType[];
} 