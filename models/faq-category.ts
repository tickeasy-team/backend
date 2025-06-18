import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { FAQ } from './faq.js';

@Entity('faqCategory')
export class FAQCategory {
  @PrimaryGeneratedColumn('uuid')
  faqCategoryId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  parentId: string;

  @ManyToOne(() => FAQCategory, category => category.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: FAQCategory;

  @OneToMany(() => FAQCategory, category => category.parent)
  children: FAQCategory[];

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => FAQ, faq => faq.category)
  faqs: FAQ[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 虛擬屬性：獲取完整路徑名稱
  get fullPath(): string {
    if (this.parent) {
      return `${this.parent.fullPath} > ${this.name}`;
    }
    return this.name;
  }

  // 虛擬屬性：檢查是否為根分類
  get isRoot(): boolean {
    return !this.parentId;
  }

  // 虛擬屬性：檢查是否有子分類
  get hasChildren(): boolean {
    return this.children && this.children.length > 0;
  }

  // 兼容舊代碼：id 別名
  get id(): string {
    return this.faqCategoryId;
  }
}
