import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { FAQCategory } from './faq-category.js';
import { FAQUsageStats } from './faq-usage-stats.js';

@Entity('faq')
export class FAQ {
  @PrimaryGeneratedColumn('uuid')
  faqId: string;

  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => FAQCategory, category => category.faqs)
  @JoinColumn({ name: 'categoryId' })
  category: FAQCategory;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'text', array: true, default: '{}' })
  keywords: string[];

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  helpfulCount: number;

  @Column({ type: 'int', default: 0 })
  notHelpfulCount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => FAQUsageStats, stats => stats.faq)
  usageStats: FAQUsageStats[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 虛擬屬性：計算有用率
  get helpfulRate(): number {
    const total = this.helpfulCount + this.notHelpfulCount;
    if (total === 0) return 0;
    return Math.round((this.helpfulCount / total) * 100);
  }

  // 虛擬屬性：總反饋數
  get totalFeedback(): number {
    return this.helpfulCount + this.notHelpfulCount;
  }

  // 虛擬屬性：檢查是否為熱門問題
  get isPopular(): boolean {
    return this.viewCount > 100 || this.helpfulCount > 10;
  }

  // 虛擬屬性：獲取關鍵字字串
  get keywordString(): string {
    return this.keywords.join(', ');
  }

  // 方法：檢查是否包含關鍵字
  containsKeyword(keyword: string): boolean {
    const lowerKeyword = keyword.toLowerCase();
    return this.keywords.some(k => k.toLowerCase().includes(lowerKeyword)) ||
           this.question.toLowerCase().includes(lowerKeyword) ||
           this.answer.toLowerCase().includes(lowerKeyword);
  }

  // 方法：增加查看次數
  incrementViewCount(): void {
    this.viewCount += 1;
  }

  // 方法：記錄反饋
  recordFeedback(isHelpful: boolean): void {
    if (isHelpful) {
      this.helpfulCount += 1;
    } else {
      this.notHelpfulCount += 1;
    }
  }

  // 兼容舊代碼
  get id(): string {
    return this.faqId;
  }
}
