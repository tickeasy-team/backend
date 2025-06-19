/**
 * 聊天服務 (使用 OpenAI Responses API)
 * 整合傳統客服會話與即時 AI 問答功能
 */

import OpenAI from 'openai';
import { supabaseService } from './supabase-service.js';
import { faqSearchService } from './faq-search-service.js';
import { AppDataSource } from '../config/database.js';
import { SupportSession, SessionStatus } from '../models/support-session.js';
import { SupportMessage, SenderType, MessageType } from '../models/support-message.js';
import * as dotenv from 'dotenv';

dotenv.config();

export interface ChatOptions {
  sessionId?: string;
  userId?: string;
  category?: string;
  createSession?: boolean; // 是否需要建立會話記錄
  previousResponseId?: string; // Responses API 的前一個回應 ID
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
  shouldTransfer?: boolean;
  sessionId?: string;
  responseId: string; // Responses API 的回應 ID
  processingTime: number;
  model: string;
  tokens: number;
}

interface SearchResult {
  id: string;
  type: 'knowledge_base' | 'faq';
  title: string;
  content: string;
  similarity: number;
  category?: string;
  keywords?: string[];
}

export class ChatService {
  private openai: OpenAI;
  private systemPrompt: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('缺少 OpenAI API Key');
    }

    this.openai = new OpenAI({ apiKey });
    this.systemPrompt = this.buildSystemPrompt();
    console.log('✅ 聊天服務初始化成功 (Responses API)');
  }

  /**
   * 建立系統提示詞
   */
  private buildSystemPrompt(): string {
    return `你是 Tickeasy 票務平台的專業客服助理。

你的職責：
1. 🎫 協助用戶解決票務相關問題（購票、退票、座位選擇等）
2. 🎵 提供演唱會和活動資訊
3. 💳 協助處理付款和訂單問題
4. 📧 引導用戶使用平台功能

回覆原則：
✅ 使用繁體中文回覆
✅ 保持專業但友善的語調
✅ 提供具體、實用的解決方案
✅ 如果不確定答案，誠實告知並建議聯繫人工客服
✅ 回覆長度控制在 100-200 字內

常見問題類型：
• 購票流程和付款問題
• 座位選擇和票種說明
• 退票和改票政策
• 演唱會時間地點資訊
• 帳號註冊和登入問題
• 電子票券使用方式

如果遇到複雜問題或用戶明確要求，請建議轉接人工客服。

現在請根據用戶的問題提供專業的協助。`;
  }

  /**
   * 檢查服務狀態
   */
  async checkServiceStatus(): Promise<boolean> {
    try {
      const response = await this.openai.responses.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        input: '測試'
      });

      return !!response.output_text;
    } catch (error) {
      console.error('❌ OpenAI 服務檢查失敗:', error);
      return false;
    }
  }

  /**
   * 統一聊天介面 (使用 Responses API)
   */
  async chat(userMessage: string, options: ChatOptions = {}): Promise<ChatResponse> {
    const startTime = Date.now();
    
    try {
      const { 
        sessionId, 
        userId, 
        category,
        createSession = false,
        previousResponseId
      } = options;

      console.log(`🤖 處理用戶提問: "${userMessage.slice(0, 50)}${userMessage.length > 50 ? '...' : ''}"`);

      // 1. 搜尋相關知識庫內容
      const searchResults = await this.searchRelevantContent(userMessage);
      const hasRelevantInfo = searchResults.length > 0;

      // 2. 構建增強的輸入內容
      const enhancedInput = this.buildEnhancedInput(userMessage, searchResults, category);

      // 3. 調用 OpenAI Responses API
      const response = await this.openai.responses.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        input: enhancedInput,
        previous_response_id: previousResponseId, // 自動處理對話歷史
        max_completion_tokens: 300,
        temperature: 0.7
      });

      const aiResponse = response.output_text || '抱歉，我現在無法回答您的問題。';
      const processingTime = Date.now() - startTime;

      // 4. 計算信心度和轉接判斷
      const confidence = this.calculateConfidence(searchResults, aiResponse, userMessage);
      const shouldTransfer = this.shouldTransferToHuman(aiResponse, confidence);

      // 5. 如果需要建立會話記錄，則儲存到資料庫
      let finalSessionId = sessionId;
      if (createSession && userId) {
        finalSessionId = await this.saveToSession(
          userId, 
          userMessage, 
          aiResponse, 
          category,
          confidence,
          shouldTransfer,
          sessionId,
          response.id // 儲存 Responses API 的 ID
        );
      }

      const chatResponse: ChatResponse = {
        message: aiResponse,
        sources: searchResults.map(source => ({
          id: source.id,
          title: source.title,
          category: source.category,
          similarity: source.similarity
        })),
        confidence,
        hasRelevantInfo,
        shouldTransfer,
        sessionId: finalSessionId,
        responseId: response.id, // 新增：Responses API 的回應 ID
        processingTime,
        model: response.model,
        tokens: response.usage?.total_tokens || 0
      };

      console.log(`✅ 客服回覆完成 (信心度: ${(confidence * 100).toFixed(1)}%, Response ID: ${response.id})`);
      return chatResponse;

    } catch (error) {
      console.error('❌ 聊天服務處理失敗:', error);
      
      return {
        message: '抱歉，系統暫時無法處理您的請求，請稍後再試或聯繫人工客服。',
        sources: [],
        confidence: 0,
        hasRelevantInfo: false,
        shouldTransfer: true,
        processingTime: Date.now() - startTime,
        responseId: '',
        model: 'fallback',
        tokens: 0
      };
    }
  }

  /**
   * 構建增強的輸入內容 (適用於 Responses API)
   */
  private buildEnhancedInput(userMessage: string, sources: SearchResult[], category?: string): any {
    let systemContent = this.systemPrompt;

    if (category) {
      systemContent += `\n\n當前諮詢類別：${category}`;
    }

    if (sources.length > 0) {
      systemContent += '\n\n相關知識庫和 FAQ 參考：\n';
      sources.forEach((source, index) => {
        const typeLabel = source.type === 'knowledge_base' ? '知識庫' : 'FAQ';
        systemContent += `${index + 1}. [${typeLabel}] ${source.title}\n   ${source.content}\n`;
        if (source.category) {
          systemContent += `   分類: ${source.category}\n`;
        }
      });
      systemContent += '\n請參考以上內容提供更精確的回答。如果用戶的問題與以上內容相關，請優先使用這些資訊。';
    }

    // 使用 Responses API 的結構化輸入格式
    return [
      {
        role: 'system',
        content: systemContent
      },
      {
        role: 'user', 
        content: userMessage
      }
    ];
  }

  /**
   * 搜尋相關內容 (保持與原版相同)
   */
  private async searchRelevantContent(userMessage: string, limit = 5): Promise<SearchResult[]> {
    try {
      console.log(`🔍 開始搜尋相關內容: "${userMessage}"`);
      
      // 使用 Supabase 知識庫搜尋
      const knowledgeBaseResults = await supabaseService.searchKnowledgeBase(userMessage, {
        limit: limit * 2
      });

      // 嘗試 FAQ 搜尋作為補充
      let faqResults: any[] = [];
      if (faqSearchService.isReady()) {
        try {
          faqResults = await faqSearchService.searchFAQ(userMessage, Math.floor(limit * 0.5));
        } catch (error: any) {
          console.warn('⚠️ FAQ 搜尋失敗，跳過:', error.message);
        }
      }

      // 合併結果
      const combinedResults: SearchResult[] = [];
      
      // 添加知識庫結果
      knowledgeBaseResults.slice(0, Math.ceil(limit * 0.7)).forEach(kb => {
        combinedResults.push({
          id: kb.id,
          type: 'knowledge_base',
          title: kb.title,
          content: kb.content,
          similarity: kb.similarity,
          category: kb.category,
          keywords: kb.tags || []
        });
      });

      // 添加 FAQ 結果
      if (faqResults && faqResults.length > 0) {
        faqResults.slice(0, Math.floor(limit * 0.3)).forEach((faq: any) => {
          combinedResults.push({
            id: faq.faq_id.toString(),
            type: 'faq',
            title: faq.question,
            content: faq.answer,
            similarity: 0.8,
            category: faq.category_name
          });
        });
      }

      // 按相似度排序並限制結果數量
      const finalResults = combinedResults
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      console.log(`✅ 搜尋完成，找到 ${finalResults.length} 個相關結果`);
      return finalResults;
      
    } catch (error) {
      console.error('❌ 內容搜尋失敗:', error);
      return [];
    }
  }

  /**
   * 計算信心度 (保持與原版相同)
   */
  private calculateConfidence(sources: SearchResult[], response: string, userMessage?: string): number {
    let confidence = 0.5; // 基礎信心度

    // 檢查是否為簡單問候語或常見對話
    const greetingPatterns = [
      '你好', 'hello', 'hi', '嗨', '您好', '哈囉',
      '謝謝', 'thank', '感謝', '再見', 'bye', '掰掰'
    ];
    
    if (userMessage) {
      const isGreeting = greetingPatterns.some(pattern => 
        userMessage.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (isGreeting) {
        confidence = 0.8; // 問候語應該有高信心度
      }
    }

    // 根據相關知識庫數量和質量調整
    if (sources.length > 0) {
      const avgSimilarity = sources.reduce((sum, s) => sum + s.similarity, 0) / sources.length;
      confidence += avgSimilarity * 0.4;
    }

    // 降低信心度的關鍵字
    const lowConfidenceKeywords = [
      '不確定', '可能', '或許', '建議聯繫', '人工客服', 
      '無法確認', '需要進一步', '抱歉'
    ];

    for (const keyword of lowConfidenceKeywords) {
      if (response.includes(keyword)) {
        confidence -= 0.15;
      }
    }

    // 提高信心度的關鍵字
    const highConfidenceKeywords = [
      '可以', '步驟', '方法', '解決', '按照', '點擊', '歡迎', '很樂意'
    ];

    for (const keyword of highConfidenceKeywords) {
      if (response.includes(keyword)) {
        confidence += 0.1;
      }
    }

    return Math.max(0.2, Math.min(1, confidence));
  }

  /**
   * 判斷是否應該轉接人工客服 (保持與原版相同)
   */
  private shouldTransferToHuman(response: string, confidence: number): boolean {
    // 信心度低於 0.6 建議轉接
    if (confidence < 0.6) return true;

    // 包含特定關鍵字建議轉接
    const transferKeywords = [
      '人工客服', '轉接', '複雜問題', '特殊情況',
      '投訴', '退款', '法律', '緊急'
    ];

    return transferKeywords.some(keyword => response.includes(keyword));
  }

  /**
   * 儲存到會話記錄 (新增 responseId 參數)
   */
  private async saveToSession(
    userId: string,
    userMessage: string,
    aiResponse: string,
    category?: string,
    confidence?: number,
    shouldTransfer?: boolean,
    existingSessionId?: string,
    responseId?: string
  ): Promise<string> {
    try {
      const supportSessionRepo = AppDataSource.getRepository(SupportSession);
      const supportMessageRepo = AppDataSource.getRepository(SupportMessage);

      // 查找或建立會話
      let session: SupportSession | null = null;
      
      if (existingSessionId) {
        session = await supportSessionRepo.findOne({
          where: { supportSessionId: existingSessionId, userId }
        });
        
        if (!session) {
          throw new Error('會話不存在或無權限');
        }
      } else {
        // 檢查是否已有活躍會話
        session = await supportSessionRepo.findOne({
          where: { userId, status: SessionStatus.ACTIVE }
        });

        if (!session) {
          // 建立新會話
          session = new SupportSession();
          session.userId = userId;
          session.category = category || '一般諮詢';
          session = await supportSessionRepo.save(session);
        }
      }

      // 儲存用戶訊息
      const userMsg = new SupportMessage();
      userMsg.sessionId = session.supportSessionId;
      userMsg.senderType = SenderType.USER;
      userMsg.senderId = userId;
      userMsg.messageText = userMessage;
      userMsg.messageType = MessageType.TEXT;
      await supportMessageRepo.save(userMsg);

      // 儲存 AI 回覆
      const botMsg = new SupportMessage();
      botMsg.sessionId = session.supportSessionId;
      botMsg.senderType = SenderType.BOT;
      botMsg.messageText = aiResponse;
      botMsg.messageType = MessageType.TEXT;
      botMsg.metadata = {
        confidence,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        responseId // 新增：儲存 Responses API 的 ID
      };
      await supportMessageRepo.save(botMsg);

      // 更新會話狀態
      if (shouldTransfer && session.status === SessionStatus.ACTIVE) {
        session.status = SessionStatus.WAITING;
        await supportSessionRepo.save(session);
      }

      // 設定首次回應時間
      if (!session.firstResponseAt) {
        session.firstResponseAt = new Date();
        await supportSessionRepo.save(session);
      }

      return session.supportSessionId;

    } catch (error) {
      console.error('❌ 儲存會話記錄失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取常見問題 (保持與原版相同)
   */
  async getCommonQuestions(): Promise<string[]> {
    try {
      const suggestions = await supabaseService.getQuerySuggestions('', 10);
      
      const commonQuestions = [
        '如何購買門票？',
        '可以退票嗎？',
        '支援哪些付款方式？',
        '電子票券怎麼使用？',
        ...suggestions.slice(0, 6)
      ];

      return Array.from(new Set(commonQuestions)); // 去重
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

  /**
   * 分析用戶意圖 (更新為 Responses API)
   */
  async analyzeIntent(userMessage: string): Promise<any> {
    try {
      const response = await this.openai.responses.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        input: [
          {
            role: 'system',
            content: `分析用戶訊息的意圖，返回 JSON 格式：
{
  "intent": "購票|退票|查詢|投訴|其他",
  "category": "票務|技術|帳號|活動|付款",
  "urgency": "低|中|高",
  "sentiment": "正面|中性|負面",
  "keywords": ["關鍵字1", "關鍵字2"]
}`
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_completion_tokens: 200,
        temperature: 0.3
      });

      const content = response.output_text;
      if (!content) {
        throw new Error('OpenAI 回應為空');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('❌ 意圖分析失敗:', error);
      return {
        intent: '其他',
        category: '一般',
        urgency: '中',
        sentiment: '中性',
        keywords: []
      };
    }
  }

  /**
   * 延續對話 (利用 Responses API 的狀態管理)
   */
  async continueChat(userMessage: string, previousResponseId: string, options: Omit<ChatOptions, 'previousResponseId'> = {}): Promise<ChatResponse> {
    return this.chat(userMessage, {
      ...options,
      previousResponseId
    });
  }

  /**
   * 檢索之前的回應 (新功能)
   */
  async retrieveResponse(responseId: string): Promise<any> {
    try {
      const response = await this.openai.responses.retrieve(responseId);
      return response;
    } catch (error) {
      console.error('❌ 檢索回應失敗:', error);
      throw error;
    }
  }
}

// 創建單例實例
export const chatService = new ChatService(); 