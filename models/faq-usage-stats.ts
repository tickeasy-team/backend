import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { FAQ } from './faq.js';
import { SupportSession } from './support-session.js';
import { User } from './user.js';

@Entity('faqUsageStat')
export class FAQUsageStats {
  @PrimaryGeneratedColumn('uuid')
  faqUsageStatId: string;

  @Column({ type: 'uuid' })
  faqId: string;

  @ManyToOne(() => FAQ, faq => faq.usageStats)
  @JoinColumn({ name: 'faqId' })
  faq: FAQ;

  @Column({ type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => SupportSession, session => session.faqUsageStats)
  @JoinColumn({ name: 'sessionId' })
  session: SupportSession;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'boolean', nullable: true })
  isHelpful: boolean;

  @Column({ type: 'text', nullable: true })
  feedbackText: string;

  @CreateDateColumn()
  createdAt: Date;

  // 虛擬屬性：檢查是否有反饋
  get hasFeedback(): boolean {
    return this.isHelpful !== null;
  }

  // 虛擬屬性：檢查是否為正面反饋
  get isPositiveFeedback(): boolean {
    return this.isHelpful === true;
  }

  // 虛擬屬性：檢查是否為負面反饋
  get isNegativeFeedback(): boolean {
    return this.isHelpful === false;
  }

  // 虛擬屬性：檢查是否有文字反饋
  get hasTextFeedback(): boolean {
    return Boolean(this.feedbackText && this.feedbackText.trim().length > 0);
  }

  // 方法：設定反饋
  setFeedback(isHelpful: boolean, feedbackText?: string): void {
    this.isHelpful = isHelpful;
    if (feedbackText) {
      this.feedbackText = feedbackText.trim();
    }
  }

  // 方法：清除反饋
  clearFeedback(): void {
    this.isHelpful = null;
    this.feedbackText = null;
  }
}
