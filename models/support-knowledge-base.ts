import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('supportKnowledgeBase')
export class SupportKnowledgeBase {
  @PrimaryGeneratedColumn('uuid')
  supportKBId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string;

  @Column({ type: 'jsonb', nullable: true })
  embeddingVector: number[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 虛擬屬性：檢查是否有嵌入向量
  get hasEmbedding(): boolean {
    return Boolean(this.embeddingVector && this.embeddingVector.length > 0);
  }

  // 虛擬屬性：取得標籤字串
  get tagString(): string {
    return this.tags.join(', ');
  }

  // 虛擬屬性：取得內容摘要（前100字元）
  get contentSummary(): string {
    if (this.content.length <= 100) return this.content;
    return this.content.substring(0, 100) + '...';
  }

  // 虛擬屬性：檢查是否包含特定標籤
  hasTag(tag: string): boolean {
    return this.tags.some(t => t.toLowerCase() === tag.toLowerCase());
  }

  // 方法：添加標籤
  addTag(tag: string): void {
    const normalizedTag = tag.trim().toLowerCase();
    if (!this.hasTag(normalizedTag)) {
      this.tags.push(normalizedTag);
    }
  }

  // 方法：移除標籤
  removeTag(tag: string): void {
    const normalizedTag = tag.toLowerCase();
    this.tags = this.tags.filter(t => t.toLowerCase() !== normalizedTag);
  }

  // 方法：設定嵌入向量
  setEmbedding(vector: number[]): void {
    this.embeddingVector = vector;
  }

  // 方法：清除嵌入向量
  clearEmbedding(): void {
    this.embeddingVector = null;
  }

  // 方法：更新內容並清除舊的嵌入向量
  updateContent(newContent: string): void {
    this.content = newContent;
    this.clearEmbedding(); // 內容變更時需要重新生成嵌入向量
  }

  // 方法：檢查內容是否包含關鍵字
  containsKeyword(keyword: string): boolean {
    const lowerKeyword = keyword.toLowerCase();
    return this.title.toLowerCase().includes(lowerKeyword) ||
           this.content.toLowerCase().includes(lowerKeyword) ||
           this.tags.some(tag => tag.toLowerCase().includes(lowerKeyword));
  }

  // 兼容舊代碼
  get id(): string {
    return this.supportKBId;
  }
}
