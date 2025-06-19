/**
 * 智能回覆服務
 * 實現分層回覆策略：關鍵字過濾 → 圖文教學 → 常見問答 → 中性回答
 */

import { supabaseService } from './supabase-service.js';
import { 
  SMART_REPLY_RULES, 
  SmartReplyRule, 
  getRulesByType
} from '../config/smart-reply-rules.js';

export interface SmartReplyOptions {
  userId?: string;
  sessionId?: string;
  enableFallbackToAI?: boolean; // 是否在沒有匹配時使用 AI
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
    confidence?: number;    // 匹配信心度
    customerServiceEmail?: string; // 客服信箱
  };
  metadata: {
    matchedKeywords?: string[];
    processingTime: number;
    strategy: string;
  };
}

// SmartReplyRule 介面已從配置檔案引入

export class SmartReplyService {
  private rules: SmartReplyRule[] = [];
  private customerServiceEmail = process.env.CUSTOMER_SERVICE_EMAIL || 'support@tickeasy.com';

  constructor() {
    this.initializeRules();
    console.log('✅ 智能回覆服務初始化成功');
  }

  /**
   * 初始化回覆規則
   */
  private initializeRules() {
    // 從配置檔案載入規則
    this.rules = [...SMART_REPLY_RULES];
    
    const tutorialCount = getRulesByType('tutorial').length;
    const faqCount = getRulesByType('faq').length;
    
    console.log(`載入 ${tutorialCount} 個圖文教學規則`);
    console.log(`載入 ${faqCount} 個 FAQ 規則`);
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
      const tutorialMatch = this.matchTutorial(userMessage);
      if (tutorialMatch) {
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
            strategy: 'tutorial_match'
          }
        };
      }

      // 2. 常見問答匹配 (中等優先級)
      const faqMatch = this.matchFAQ(userMessage);
      if (faqMatch) {
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
            strategy: 'faq_match'
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
   * 匹配圖文教學
   */
  private matchTutorial(userMessage: string): { 
    title: string; 
    url: string; 
    description: string; 
    confidence: number; 
    matchedKeywords: string[] 
  } | null {
    const message = userMessage.toLowerCase();
    let bestMatch: any = null;
    let bestScore = 0;

    const tutorialRules = this.rules.filter(rule => rule.replyType === 'tutorial' && rule.isActive !== false);

    for (const rule of tutorialRules) {
      const matchedKeywords: string[] = [];
      let score = 0;

      for (const keyword of rule.keywords) {
        if (message.includes(keyword.toLowerCase())) {
          matchedKeywords.push(keyword);
          score += 1 / rule.priority; // 優先級越高，分數越高
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          title: rule.tutorialTitle!,
          url: rule.tutorialUrl!,
          description: rule.tutorialDescription || '',
          confidence: Math.min(score * 0.3, 0.95), // 調整信心度計算
          matchedKeywords
        };
      }
    }

    return bestScore >= 0.3 ? bestMatch : null; // 降低閾值，提高匹配率
  }

  /**
   * 匹配常見問答
   */
  private matchFAQ(userMessage: string): {
    answer: string;
    faqId?: string;
    confidence: number;
    matchedKeywords: string[];
    relatedQuestions?: string[];
  } | null {
    const message = userMessage.toLowerCase();
    let bestMatch: any = null;
    let bestScore = 0;

    const faqRules = this.rules.filter(rule => rule.replyType === 'faq' && rule.isActive !== false);

    for (const rule of faqRules) {
      const matchedKeywords: string[] = [];
      let score = 0;

      for (const keyword of rule.keywords) {
        if (message.includes(keyword.toLowerCase())) {
          matchedKeywords.push(keyword);
          score += 1 / rule.priority;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          answer: rule.faqAnswer!,
          faqId: rule.faqId,
          relatedQuestions: rule.relatedQuestions,
          confidence: Math.min(score * 0.3, 0.9),
          matchedKeywords
        };
      }
    }

    return bestScore >= 0.3 ? bestMatch : null;
  }

  /**
   * 嘗試知識庫搜尋
   */
  private async tryKnowledgeBaseSearch(userMessage: string): Promise<SmartReplyResponse | null> {
    try {
      const results = await supabaseService.searchKnowledgeBase(userMessage, { limit: 3 });
      
      if (results.length > 0 && results[0].similarity > 0.7) {
        const bestResult = results[0];
        return {
          type: 'faq',
          message: `根據我們的資料庫，以下資訊可能對您有幫助：\n\n**${bestResult.title}**\n\n${bestResult.content}\n\n如需更詳細的協助，請聯繫客服：${this.customerServiceEmail}`,
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
    } catch (error) {
      console.warn('⚠️ 知識庫搜尋失敗:', error);
    }

    return null;
  }

  /**
   * 中性回答
   */
  private getNeutralReply(userMessage: string, startTime: number): SmartReplyResponse {
    const neutralMessages = [
      '感謝您的詢問！為了提供您最準確的協助，建議您：',
      '我了解您的問題，以下方式可以為您提供更詳細的協助：',
      '很抱歉我無法立即回答您的問題，但我們有以下管道可以協助您：'
    ];

    const randomMessage = neutralMessages[Math.floor(Math.random() * neutralMessages.length)];

    return {
      type: 'neutral',
      message: `${randomMessage}

📧 **客服信箱**: ${this.customerServiceEmail}
⏰ **服務時間**: 週一至週五 09:00-18:00

💡 **常見問題**: 您也可以瀏覽我們的 [常見問題頁面](/help/faq) 尋找答案

我們會盡快回覆您的問題！`,
      data: {
        customerServiceEmail: this.customerServiceEmail
      },
      metadata: {
        processingTime: Date.now() - startTime,
        strategy: 'neutral_reply'
      }
    };
  }

  /**
   * 動態添加規則
   */
  addRule(rule: SmartReplyRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 獲取所有規則統計
   */
  getRulesStats(): { tutorials: number; faqs: number; total: number } {
    const activeRules = this.rules.filter(rule => rule.isActive !== false);
    return {
      tutorials: activeRules.filter(rule => rule.replyType === 'tutorial').length,
      faqs: activeRules.filter(rule => rule.replyType === 'faq').length,
      total: activeRules.length
    };
  }
}

// 創建單例實例
export const smartReplyService = new SmartReplyService(); 