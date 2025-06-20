/**
 * 智能回覆服務 (資料庫版本)
 * 使用 Knowledge Base 實現分層回覆策略：關鍵字過濾 → 圖文教學 → 常見問答 → 中性回答
 */

import { AppDataSource } from '../config/database.js';
import { SupportKnowledgeBase } from '../models/support-knowledge-base.js';
import { supabaseService } from './supabase-service.js';

export interface SmartReplyOptions {
  userId?: string;
  sessionId?: string;
  enableFallbackToAI?: boolean;
}

export interface SmartReplyResponse {
  type: 'tutorial' | 'faq' | 'neutral' | 'ai_fallback';
  message: string;
  tutorial?: {
    title: string;
    url: string;
    description?: string;
  };
  faq?: {
    answer: string;
    faqId?: string;
    relatedQuestions?: string[];
  };
  data?: {
    confidence?: number;
    customerServiceEmail?: string;
  };
  metadata: {
    matchedKeywords?: string[];
    processingTime: number;
    strategy: string;
    ruleId?: string;
  };
}

export class SmartReplyService {
  private customerServiceEmail = process.env.CUSTOMER_SERVICE_EMAIL || 'support@tickeasy.com';
  private knowledgeBaseRepo = AppDataSource.getRepository(SupportKnowledgeBase);

  constructor() {
    console.log('✅ 智能回覆服務初始化成功 (資料庫版本)');
  }

  /**
   * 處理使用者訊息 - 主要入口
   */
  async processMessage(userMessage: string): Promise<SmartReplyResponse> {
    return this.getSmartReply(userMessage);
  }

  /**
   * 智能回覆主要邏輯
   */
  async getSmartReply(userMessage: string): Promise<SmartReplyResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`🤖 智能回覆處理: "${userMessage.slice(0, 50)}${userMessage.length > 50 ? '...' : ''}"`);

      // 1. 圖文教學匹配 (最高優先級)
      const tutorialMatch = await this.matchTutorial(userMessage);
      if (tutorialMatch) {
        // 增加查看計數
        await this.incrementViewCount(tutorialMatch.ruleId);
        
        return {
          type: 'tutorial',
          message: `我為您找到了相關的圖文教學：**${tutorialMatch.title}**\n\n${tutorialMatch.description}\n\n👉 [點擊查看完整教學](${tutorialMatch.url})\n\n如還有其他問題，歡迎隨時詢問！`,
          tutorial: {
            title: tutorialMatch.title,
            url: tutorialMatch.url,
            description: tutorialMatch.description
          },
          data: {
            confidence: tutorialMatch.confidence
          },
          metadata: {
            matchedKeywords: tutorialMatch.matchedKeywords,
            processingTime: Date.now() - startTime,
            strategy: 'tutorial_match',
            ruleId: tutorialMatch.ruleId
          }
        };
      }

      // 2. 常見問答匹配 (中等優先級)
      const faqMatch = await this.matchFAQ(userMessage);
      if (faqMatch) {
        // 增加查看計數
        await this.incrementViewCount(faqMatch.ruleId);
        
        return {
          type: 'faq',
          message: faqMatch.answer + (faqMatch.relatedQuestions?.length ? 
            `\n\n**您可能也想了解：**\n${faqMatch.relatedQuestions.map(q => `• ${q}`).join('\n')}` : ''),
          faq: {
            answer: faqMatch.answer,
            faqId: faqMatch.faqId,
            relatedQuestions: faqMatch.relatedQuestions
          },
          data: {
            confidence: faqMatch.confidence
          },
          metadata: {
            matchedKeywords: faqMatch.matchedKeywords,
            processingTime: Date.now() - startTime,
            strategy: 'faq_match',
            ruleId: faqMatch.ruleId
          }
        };
      }

      // 3. 知識庫搜尋嘗試 (作為補充)
      const knowledgeMatch = await this.tryKnowledgeBaseSearch(userMessage);
      if (knowledgeMatch) {
        return knowledgeMatch;
      }

      // 4. 中性回答 + 客服信箱 (最後手段)
      return this.getNeutralReply(userMessage, startTime);

    } catch (error) {
      console.error('❌ 智能回覆處理失敗:', error);
      return this.getNeutralReply(userMessage, startTime);
    }
  }

  /**
   * 匹配圖文教學 (從資料庫)
   */
  private async matchTutorial(userMessage: string): Promise<{ 
    title: string; 
    url: string; 
    description: string; 
    confidence: number; 
    matchedKeywords: string[];
    ruleId: string;
  } | null> {
    try {
      // 從資料庫獲取所有圖文教學規則
      const tutorialRules = await this.knowledgeBaseRepo.find({
        where: { 
          replyType: 'tutorial', 
          isActive: true 
        },
        order: { priority: 'ASC' } // 優先級排序
      });

      if (tutorialRules.length === 0) {
        console.log('⚠️ 沒有找到圖文教學規則');
        return null;
      }

      console.log(`🔍 找到 ${tutorialRules.length} 個圖文教學規則`);
      console.log(`🔍 用戶輸入: "${userMessage}"`);
      
      // 調試：檢查第一個規則
      if (tutorialRules[0]) {
        const firstRule = tutorialRules[0];
        console.log(`🔍 第一個規則 - ID: ${firstRule.ruleId}, 關鍵字: [${firstRule.keywords.join(', ')}]`);
      }

      let bestMatch: any = null;
      let bestScore = 0;

      for (const rule of tutorialRules) {
        const score = rule.calculateKeywordScore(userMessage);
        console.log(`🔍 規則 ${rule.ruleId} 分數: ${score.toFixed(4)}`);
        
        if (score > bestScore) {
          bestScore = score;
          const matchedKeywords = rule.keywords.filter(keyword => 
            userMessage.toLowerCase().includes(keyword.toLowerCase())
          );
          
          bestMatch = {
            title: rule.title,
            url: rule.tutorialUrl!,
            description: rule.tutorialDescription || rule.content,
            confidence: Math.min(score, 0.95),
            matchedKeywords,
            ruleId: rule.ruleId!
          };
        }
      }

      console.log(`🔍 最佳分數: ${bestScore.toFixed(4)}, 閾值: 0.2`);
      console.log(`🔍 是否達到閾值: ${bestScore >= 0.2 ? '✅ 是' : '❌ 否'}`);
      
      return bestScore >= 0.2 ? bestMatch : null; // 降低閾值，提高匹配率

    } catch (error) {
      console.error('❌ 圖文教學匹配失敗:', error);
      return null;
    }
  }

  /**
   * 匹配常見問答 (從資料庫)
   */
  private async matchFAQ(userMessage: string): Promise<{
    answer: string;
    faqId?: string;
    confidence: number;
    matchedKeywords: string[];
    relatedQuestions?: string[];
    ruleId: string;
  } | null> {
    try {
      // 從資料庫獲取所有 FAQ 規則
      const faqRules = await this.knowledgeBaseRepo.find({
        where: { 
          replyType: 'faq', 
          isActive: true 
        },
        order: { priority: 'ASC' } // 優先級排序
      });

      if (faqRules.length === 0) {
        console.log('⚠️ 沒有找到 FAQ 規則');
        return null;
      }

      let bestMatch: any = null;
      let bestScore = 0;

      for (const rule of faqRules) {
        const score = rule.calculateKeywordScore(userMessage);
        
        if (score > bestScore) {
          bestScore = score;
          const matchedKeywords = rule.keywords.filter(keyword => 
            userMessage.toLowerCase().includes(keyword.toLowerCase())
          );
          
          bestMatch = {
            answer: rule.faqAnswer || rule.content,
            faqId: rule.ruleId!,
            confidence: Math.min(score, 0.95),
            matchedKeywords,
            relatedQuestions: rule.relatedQuestions,
            ruleId: rule.ruleId!
          };
        }
      }

      return bestScore >= 0.2 ? bestMatch : null;

    } catch (error) {
      console.error('❌ FAQ 匹配失敗:', error);
      return null;
    }
  }

  /**
   * 嘗試知識庫搜尋 (一般知識庫內容)
   */
  private async tryKnowledgeBaseSearch(userMessage: string): Promise<SmartReplyResponse | null> {
    try {
      // 搜尋一般知識庫內容 (非智能回覆規則)
      const knowledgeResults = await supabaseService.searchKnowledgeBase(userMessage, {
        limit: 3
      });

      if (knowledgeResults.length > 0 && knowledgeResults[0].similarity > 0.7) {
        const bestResult = knowledgeResults[0];
        
        return {
          type: 'faq',
          message: `根據知識庫搜尋結果：\n\n**${bestResult.title}**\n\n${bestResult.content}\n\n如需更多協助，請聯繫客服：${this.customerServiceEmail}`,
          faq: {
            answer: bestResult.content,
            faqId: bestResult.id
          },
          data: {
            confidence: bestResult.similarity,
            customerServiceEmail: this.customerServiceEmail
          },
          metadata: {
            processingTime: Date.now() - Date.now(),
            strategy: 'knowledge_base_search'
          }
        };
      }

      return null;
    } catch (error) {
      console.error('❌ 知識庫搜尋失敗:', error);
      return null;
    }
  }

  /**
   * 中性回答
   */
  private getNeutralReply(userMessage: string, startTime: number): SmartReplyResponse {
    const neutralMessages = [
      '感謝您的詢問！您的問題我們已經收到。',
      '很抱歉，我目前無法完全理解您的問題。',
      '謝謝您聯繫我們！'
    ];

    const randomMessage = neutralMessages[Math.floor(Math.random() * neutralMessages.length)];
    
    return {
      type: 'neutral',
      message: `${randomMessage}\n\n為了提供您更準確的協助，建議您：\n\n📧 **聯繫客服信箱**：${this.customerServiceEmail}\n📞 **客服專線**：02-1234-5678\n⏰ **服務時間**：週一至週五 09:00-18:00\n\n我們的客服團隊將竭誠為您服務！`,
      data: {
        customerServiceEmail: this.customerServiceEmail,
        confidence: 0.1
      },
      metadata: {
        processingTime: Date.now() - startTime,
        strategy: 'neutral_fallback'
      }
    };
  }

  /**
   * 增加查看計數
   */
  private async incrementViewCount(ruleId: string): Promise<void> {
    try {
      await this.knowledgeBaseRepo.update(
        { ruleId },
        { viewCount: () => '"viewCount" + 1' }
      );
    } catch (error) {
      console.error('❌ 更新查看計數失敗:', error);
    }
  }

  /**
   * 記錄有用/無用反饋
   */
  async recordFeedback(ruleId: string, isHelpful: boolean): Promise<void> {
    try {
      const updateField = isHelpful ? 'helpfulCount' : 'notHelpfulCount';
      await this.knowledgeBaseRepo.update(
        { ruleId },
        { [updateField]: () => `"${updateField}" + 1` }
      );
      console.log(`✅ 記錄反饋成功: ${ruleId} - ${isHelpful ? '有用' : '無用'}`);
    } catch (error) {
      console.error('❌ 記錄反饋失敗:', error);
    }
  }

  /**
   * 獲取規則統計
   */
  async getRulesStats(): Promise<{ 
    tutorials: number; 
    faqs: number; 
    total: number;
    byPriority: Record<string, number>;
    topPerforming: any[];
  }> {
    try {
      const [tutorials, faqs, total] = await Promise.all([
        this.knowledgeBaseRepo.count({ where: { replyType: 'tutorial', isActive: true } }),
        this.knowledgeBaseRepo.count({ where: { replyType: 'faq', isActive: true } }),
        this.knowledgeBaseRepo.count({ where: { isActive: true } })
      ]);

      // 按優先級統計
      const priorityStats = await this.knowledgeBaseRepo
        .createQueryBuilder('kb')
        .select('kb.priority', 'priority')
        .addSelect('COUNT(*)', 'count')
        .where('kb.isActive = :active', { active: true })
        .andWhere('kb.ruleId IS NOT NULL')
        .groupBy('kb.priority')
        .getRawMany();

      const byPriority = priorityStats.reduce((acc, stat) => {
        acc[`priority${stat.priority}`] = parseInt(stat.count);
        return acc;
      }, {} as Record<string, number>);

      // 最受歡迎的規則
      const topPerforming = await this.knowledgeBaseRepo.find({
        where: { isActive: true, ruleId: { $ne: null } as any },
        order: { viewCount: 'DESC' },
        take: 5,
        select: ['ruleId', 'title', 'viewCount', 'helpfulCount', 'notHelpfulCount']
      });

      return {
        tutorials,
        faqs,
        total,
        byPriority,
        topPerforming
      };
    } catch (error) {
      console.error('❌ 獲取統計失敗:', error);
      return { tutorials: 0, faqs: 0, total: 0, byPriority: {}, topPerforming: [] };
    }
  }

  /**
   * 動態新增規則 (直接寫入資料庫)
   */
  async addRule(ruleData: {
    ruleId: string;
    title: string;
    content: string;
    category: string;
    replyType: 'tutorial' | 'faq';
    keywords: string[];
    priority: number;
    tutorialUrl?: string;
    tutorialDescription?: string;
    faqAnswer?: string;
    relatedQuestions?: string[];
  }): Promise<boolean> {
    try {
      const rule = this.knowledgeBaseRepo.create({
        ...ruleData,
        isActive: true
      });

      await this.knowledgeBaseRepo.save(rule);
      console.log(`✅ 新增規則成功: ${ruleData.ruleId}`);
      return true;
    } catch (error) {
      console.error('❌ 新增規則失敗:', error);
      return false;
    }
  }
}

// 創建單例實例
export const smartReplyService = new SmartReplyService(); 