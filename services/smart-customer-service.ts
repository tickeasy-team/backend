/**
 * 智能客服服務
 * 整合 OpenAI 和知識庫搜尋
 */

import OpenAI from 'openai';
import { supabaseService } from './supabase-service.js';
import dotenv from 'dotenv';

dotenv.config();

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  sources: Array<{
    id: string;
    title: string;
    category?: string;
    similarity: number;
  }>;
  confidence: number;
  hasRelevantInfo: boolean;
}

export class SmartCustomerService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('缺少 OpenAI API Key');
    }

    this.openai = new OpenAI({ apiKey });
    console.log('✅ 智能客服服務初始化成功');
  }

  /**
   * 檢查 OpenAI 服務狀態
   */
  async checkServiceStatus(): Promise<boolean> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: '測試' }],
        max_tokens: 10
      });

      return !!response.choices[0]?.message?.content;
    } catch (error) {
      console.error('❌ OpenAI 服務檢查失敗:', error);
      return false;
    }
  }

  /**
   * 智能客服對話
   */
  async chat(userMessage: string, options: {
    includeHistory?: ChatMessage[];
    searchThreshold?: number;
  } = {}): Promise<ChatResponse> {
    try {
      const { includeHistory = [], searchThreshold = 0.1 } = options;

      console.log(`🤖 處理用戶提問: "${userMessage}"`);

      // 1. 搜尋相關知識庫內容
      const searchResults = await supabaseService.searchKnowledgeBase(userMessage, {
        limit: 5
      });

      console.log(`📚 找到 ${searchResults.length} 個相關知識庫項目`);

      // 2. 篩選高相關度的內容
      const relevantSources = searchResults.filter(item => item.similarity >= searchThreshold);
      const hasRelevantInfo = relevantSources.length > 0;

      // 3. 構建 AI 提示詞
      const systemPrompt = this.buildSystemPrompt(relevantSources);
      
      // 4. 準備對話歷史
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...includeHistory,
        { role: 'user', content: userMessage }
      ];

      // 5. 調用 OpenAI
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        max_tokens: 800,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const aiResponse = completion.choices[0]?.message?.content || '抱歉，我現在無法回答您的問題。';

      // 6. 計算回覆信心度
      const confidence = this.calculateConfidence(relevantSources, aiResponse);

      console.log(`✅ 智能客服回覆完成 (信心度: ${(confidence * 100).toFixed(1)}%)`);

      return {
        message: aiResponse,
        sources: relevantSources.map(source => ({
          id: source.id,
          title: source.title,
          category: source.category,
          similarity: source.similarity
        })),
        confidence,
        hasRelevantInfo
      };

    } catch (error) {
      console.error('❌ 智能客服處理失敗:', error);
      
      return {
        message: '抱歉，系統暫時無法處理您的請求，請稍後再試或聯繫人工客服。',
        sources: [],
        confidence: 0,
        hasRelevantInfo: false
      };
    }
  }

  /**
   * 構建系統提示詞
   */
  private buildSystemPrompt(sources: any[]): string {
    const currentTime = new Date().toLocaleString('zh-TW');
    
    let prompt = `您是 Tickeasy 票券平台的智能客服助手。

## 身份與職責
- 您是專業、友善、樂於助人的客服代表
- 主要協助用戶解決購票、退票、付款、票券使用等問題
- 總是以用戶的最佳利益為出發點

## 回覆原則
1. **準確性第一**: 只基於提供的知識庫內容回答，不要編造信息
2. **簡潔明瞭**: 回答要直接、清楚，避免冗長
3. **友善專業**: 使用溫和、專業的語調
4. **完整回覆**: 盡量一次性解決用戶問題
5. **引導明確**: 如需進一步協助，明確告知下一步該怎麼做

## 知識庫內容`;

    if (sources.length > 0) {
      prompt += `\n以下是相關的知識庫內容：\n\n`;
      sources.forEach((source, index) => {
        prompt += `【${index + 1}】${source.title} (分類: ${source.category || '一般'})\n${source.content}\n\n`;
      });
    } else {
      prompt += `\n目前沒有找到直接相關的知識庫內容。請基於 Tickeasy 票券平台的一般常識回答，或建議用戶聯繫人工客服。\n\n`;
    }

    prompt += `## 無法回答時
如果無法根據知識庫內容回答用戶問題，請禮貌地說明，並建議：
1. 聯繫人工客服
2. 查看網站幫助中心
3. 或提供相關的聯繫方式

## 注意事項
- 不要提供錯誤或過時的信息
- 對於政策相關問題，建議查看最新官方公告
- 敏感問題（如退款、糾紛）建議轉接人工客服

當前時間: ${currentTime}`;

    return prompt;
  }

  /**
   * 計算回覆信心度
   */
  private calculateConfidence(sources: any[], response: string): number {
    let confidence = 0.5; // 基礎信心度

    // 根據相關知識庫數量和質量調整
    if (sources.length > 0) {
      const avgSimilarity = sources.reduce((sum, s) => sum + s.similarity, 0) / sources.length;
      confidence += avgSimilarity * 0.4;
    }

    // 根據回覆長度調整（太短可能不完整，太長可能不夠精確）
    const responseLength = response.length;
    if (responseLength > 50 && responseLength < 500) {
      confidence += 0.1;
    }

    // 確保信心度在 0-1 之間
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * 語義搜尋（使用 OpenAI 嵌入）
   */
  async semanticSearch(query: string, options: {
    limit?: number;
    threshold?: number;
  } = {}): Promise<any[]> {
    try {
      // 這裡可以實作語義搜尋
      // 目前先使用關鍵字搜尋作為後備
      return await supabaseService.searchKnowledgeBase(query, {
        limit: options.limit || 5
      });
    } catch (error) {
      console.error('❌ 語義搜尋失敗:', error);
      return [];
    }
  }

  /**
   * 獲取常見問題建議
   */
  async getCommonQuestions(): Promise<string[]> {
    try {
      // 基於知識庫標題生成常見問題
      const stats = await supabaseService.getKnowledgeBaseStats();
      const suggestions = await supabaseService.getQuerySuggestions('', 10);
      
      const commonQuestions = [
        '如何購買門票？',
        '可以退票嗎？',
        '支援哪些付款方式？',
        '電子票券怎麼使用？',
        ...suggestions.slice(0, 6)
      ];

      return [...new Set(commonQuestions)]; // 去重
    } catch (error) {
      console.error('❌ 獲取常見問題失敗:', error);
      return [
        '如何購買門票？',
        '可以退票嗎？',
        '支援哪些付款方式？',
        '電子票券怎麼使用？'
      ];
    }
  }
}

// 創建單例
export const smartCustomerService = new SmartCustomerService();
