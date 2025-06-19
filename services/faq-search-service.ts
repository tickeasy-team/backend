/**
 * FAQ 搜尋服務
 * 替代 MCP Service，直接使用 TypeORM 查詢資料庫
 */

import { AppDataSource } from '../config/database.js';
import { FAQ } from '../models/faq.js';
import { FAQCategory } from '../models/faq-category.js';

export interface FAQSearchResult {
  faq_id: string;
  question: string;
  answer: string;
  keywords: string[];
  category_name?: string;
  helpful_count: number;
  view_count: number;
}

export class FAQSearchService {
  
  /**
   * 根據關鍵字搜尋 FAQ
   */
  async searchFAQ(keyword: string, limit: number = 10): Promise<FAQSearchResult[]> {
    try {
      console.log(`🔍 搜尋 FAQ: "${keyword}"`);
      
      const faqRepo = AppDataSource.getRepository(FAQ);
      
      const queryBuilder = faqRepo.createQueryBuilder('faq')
        .leftJoin('faq.category', 'category')
        .select([
          'faq.faqId',
          'faq.question', 
          'faq.answer',
          'faq.keywords',
          'faq.helpfulCount',
          'faq.viewCount',
          'category.name'
        ])
        .where('faq.isActive = :active', { active: true });

      // 搜尋條件：問題、答案或關鍵字匹配
      queryBuilder.andWhere(
        `(
          LOWER(faq.question) LIKE LOWER(:keyword) OR 
          LOWER(faq.answer) LIKE LOWER(:keyword) OR 
          EXISTS (
            SELECT 1 FROM unnest(faq.keywords) AS keyword_item 
            WHERE LOWER(keyword_item) LIKE LOWER(:keyword)
          )
        )`,
        { keyword: `%${keyword}%` }
      );

      const faqs = await queryBuilder
        .orderBy('faq.helpfulCount', 'DESC')
        .addOrderBy('faq.viewCount', 'DESC')
        .limit(limit)
        .getMany();

      console.log(`✅ 找到 ${faqs.length} 個相關 FAQ`);

      // 轉換為原本 MCP 格式，保持兼容性
      return faqs.map(faq => ({
        faq_id: faq.faqId,
        question: faq.question,
        answer: faq.answer,
        keywords: faq.keywords || [],
        category_name: faq.category?.name,
        helpful_count: faq.helpfulCount || 0,
        view_count: faq.viewCount || 0
      }));

    } catch (error) {
      console.error('❌ FAQ 搜尋失敗:', error);
      return [];
    }
  }

  /**
   * 根據分類 ID 搜尋 FAQ
   */
  async searchByCategory(categoryId: string, limit: number = 20): Promise<FAQSearchResult[]> {
    try {
      const faqRepo = AppDataSource.getRepository(FAQ);
      
      const queryBuilder = faqRepo.createQueryBuilder('faq')
        .leftJoin('faq.category', 'category')
        .select([
          'faq.faqId',
          'faq.question', 
          'faq.answer',
          'faq.keywords',
          'faq.helpfulCount',
          'faq.viewCount',
          'category.name'
        ])
        .where('faq.categoryId = :categoryId', { categoryId })
        .andWhere('faq.isActive = :active', { active: true })
        .orderBy('faq.helpfulCount', 'DESC')
        .addOrderBy('faq.viewCount', 'DESC')
        .limit(limit);

      const faqs = await queryBuilder.getMany();

      return faqs.map(faq => ({
        faq_id: faq.faqId,
        question: faq.question,
        answer: faq.answer,
        keywords: faq.keywords || [],
        category_name: faq.category?.name,
        helpful_count: faq.helpfulCount || 0,
        view_count: faq.viewCount || 0
      }));

    } catch (error) {
      console.error('❌ 按分類搜尋 FAQ 失敗:', error);
      return [];
    }
  }

  /**
   * 獲取所有 FAQ 分類
   */
  async getCategories(): Promise<Array<{ id: string; name: string; description: string }>> {
    try {
      const categoryRepo = AppDataSource.getRepository(FAQCategory);
      
      const categories = await categoryRepo.find({
        where: { isActive: true },
        order: { sortOrder: 'ASC' }
      });

      return categories.map(category => ({
        id: category.faqCategoryId,
        name: category.name,
        description: category.description || ''
      }));

    } catch (error) {
      console.error('❌ 獲取 FAQ 分類失敗:', error);
      return [];
    }
  }

  /**
   * 獲取熱門 FAQ
   */
  async getPopularFAQs(limit: number = 10): Promise<FAQSearchResult[]> {
    try {
      const faqRepo = AppDataSource.getRepository(FAQ);
      
      const queryBuilder = faqRepo.createQueryBuilder('faq')
        .leftJoin('faq.category', 'category')
        .select([
          'faq.faqId',
          'faq.question', 
          'faq.answer',
          'faq.keywords',
          'faq.helpfulCount',
          'faq.viewCount',
          'category.name'
        ])
        .where('faq.isActive = :active', { active: true })
        .orderBy('faq.viewCount', 'DESC')
        .addOrderBy('faq.helpfulCount', 'DESC')
        .limit(limit);

      const faqs = await queryBuilder.getMany();

      return faqs.map(faq => ({
        faq_id: faq.faqId,
        question: faq.question,
        answer: faq.answer,
        keywords: faq.keywords || [],
        category_name: faq.category?.name,
        helpful_count: faq.helpfulCount || 0,
        view_count: faq.viewCount || 0
      }));

    } catch (error) {
      console.error('❌ 獲取熱門 FAQ 失敗:', error);
      return [];
    }
  }

  /**
   * 增加 FAQ 查看次數
   */
  async incrementViewCount(faqId: string): Promise<boolean> {
    try {
      const faqRepo = AppDataSource.getRepository(FAQ);
      
      await faqRepo.increment({ faqId }, 'viewCount', 1);
      
      console.log(`📈 FAQ ${faqId} 查看次數 +1`);
      return true;

    } catch (error) {
      console.error('❌ 增加 FAQ 查看次數失敗:', error);
      return false;
    }
  }

  /**
   * 檢查服務是否準備好
   */
  isReady(): boolean {
    return AppDataSource && AppDataSource.isInitialized;
  }
}

// 創建單例實例
export const faqSearchService = new FAQSearchService();
