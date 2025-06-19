/**
 * OpenAI 客服服務
 * 整合 ChatGPT 提供智能客服回覆
 */

import OpenAI from 'openai';
import { faqSearchService } from './faq-search-service.js';
import { semanticSearchService } from './semantic-search-service.js';

export class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.systemPrompt = this.buildSystemPrompt();
  }

  /**
   * 建立系統提示詞
   */
  buildSystemPrompt() {
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
   * 生成 AI 回覆
   */
  async generateResponse(userMessage, conversationHistory = [], sessionContext = {}) {
    try {
      // 準備對話訊息
      const messages = [
        { role: 'system', content: this.systemPrompt }
      ];

      // 添加對話歷史
      if (conversationHistory.length > 0) {
        // 只保留最近 10 則訊息避免 token 過多
        const recentHistory = conversationHistory.slice(-10);
        for (const msg of recentHistory) {
          messages.push({
            role: msg.senderType === 'user' ? 'user' : 'assistant',
            content: msg.messageText
          });
        }
      }

      // 添加當前用戶訊息
      messages.push({
        role: 'user',
        content: userMessage
      });

      // 如果有會話上下文，添加相關資訊
      if (sessionContext.category) {
        messages[0].content += `\\n\\n當前諮詢類別：${sessionContext.category}`;
      }

      const startTime = Date.now();

      // 調用 OpenAI API
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // 使用較經濟的模型
        messages,
        max_tokens: 300,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const processingTime = Date.now() - startTime;
      const aiResponse = response.choices[0].message.content;

      // 分析回覆的信心度（簡單的關鍵字分析）
      const confidence = this.calculateConfidence(aiResponse, userMessage);

      // 檢查是否需要轉接人工客服
      const shouldTransfer = this.shouldTransferToHuman(aiResponse, confidence);

      return {
        success: true,
        response: aiResponse,
        confidence,
        shouldTransfer,
        processingTime,
        model: response.model,
        tokens: response.usage.total_tokens,
        metadata: {
          finishReason: response.choices[0].finish_reason,
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens
        }
      };

    } catch (error) {
      console.error('❌ OpenAI API 調用失敗:', error);
      
      return {
        success: false,
        error: error.message,
        response: this.getFallbackResponse(),
        confidence: 0,
        shouldTransfer: true,
        processingTime: 0
      };
    }
  }

  /**
   * 計算 AI 回覆信心度
   */
  calculateConfidence(response, userMessage) {
    let confidence = 0.8; // 基礎信心度

    // 降低信心度的情況
    const lowConfidenceKeywords = [
      '不確定', '可能', '或許', '建議聯繫', '人工客服', 
      '無法確認', '需要進一步', '抱歉'
    ];

    for (const keyword of lowConfidenceKeywords) {
      if (response.includes(keyword)) {
        confidence -= 0.2;
      }
    }

    // 提高信心度的情況
    const highConfidenceKeywords = [
      '可以', '步驟', '方法', '解決', '按照', '點擊'
    ];

    for (const keyword of highConfidenceKeywords) {
      if (response.includes(keyword)) {
        confidence += 0.1;
      }
    }

    // 如果用戶問題很簡單，提高信心度
    const simpleQuestions = ['你好', '謝謝', '再見', '營業時間'];
    if (simpleQuestions.some(q => userMessage.includes(q))) {
      confidence += 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * 判斷是否應該轉接人工客服
   */
  shouldTransferToHuman(response, confidence) {
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
   * 後備回覆（當 AI 服務失敗時）
   */
  getFallbackResponse() {
    const fallbackResponses = [
      '很抱歉，我現在遇到一些技術問題。請稍後再試，或點擊下方按鈕聯繫人工客服。',
      '系統暫時忙碌中，建議您聯繫我們的人工客服獲得即時協助。',
      '抱歉無法立即回覆您的問題，請嘗試重新提問或聯繫客服專員。'
    ];

    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }

  /**
   * 搜尋相關 FAQ 和知識庫（使用語義搜尋）
   */
  async searchRelevantContent(userMessage, limit = 3) {
    try {
      console.log(`🔍 開始語義搜尋相關內容: "${userMessage}"`);
      
      // 使用語義搜尋獲取知識庫內容
      const knowledgeBaseResults = await semanticSearchService.searchKnowledgeBase(userMessage, {
        limit: limit * 2, // 獲取更多結果以便篩選
        threshold: 0.6 // 降低閾值以獲取更多潛在相關結果
      });

      // 使用新的 FAQ 搜尋服務作為後備
      let faqResults = [];
      if (faqSearchService.isReady()) {
        try {
          faqResults = await faqSearchService.searchFAQ(userMessage, Math.floor(limit * 0.5));
        } catch (error) {
          console.warn('⚠️ FAQ 搜尋失敗，跳過:', error.message);
        }
      }

      // 合併和格式化結果
      const combinedResults = [];
      
      // 添加知識庫結果
      knowledgeBaseResults.slice(0, Math.ceil(limit * 0.7)).forEach(kb => {
        combinedResults.push({
          id: kb.id,
          type: 'knowledge_base',
          question: kb.title,
          answer: kb.content,
          confidence: kb.similarity,
          category: kb.category,
          keywords: kb.keywords
        });
      });

      // 添加 FAQ 結果
      if (faqResults && faqResults.length > 0) {
        faqResults.slice(0, Math.floor(limit * 0.3)).forEach(faq => {
          combinedResults.push({
            id: faq.faq_id,
            type: 'faq',
            question: faq.question,
            answer: faq.answer,
            confidence: 0.8, // FAQ 預設信心度
            category: faq.category_name
          });
        });
      }

      // 按信心度排序並限制結果數量
      const finalResults = combinedResults
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, limit);

      console.log(`✅ 語義搜尋完成，找到 ${finalResults.length} 個相關結果`);
      return finalResults;
      
    } catch (error) {
      console.error('❌ 語義搜尋失敗:', error);
      // 降級到原本的 FAQ 搜尋
      return this.searchRelevantFAQ(userMessage, limit);
    }
  }

  /**
   * FAQ 搜尋（使用新的 FAQSearchService）
   */
  async searchRelevantFAQ(userMessage, limit = 3) {
    try {
      if (!faqSearchService.isReady()) {
        console.warn('⚠️  FAQ Search Service 未準備好，跳過 FAQ 搜尋');
        return [];
      }

      const faqResults = await faqSearchService.searchFAQ(userMessage, limit);
      
      if (faqResults && faqResults.length > 0) {
        return faqResults.map(faq => ({
          id: faq.faq_id,
          type: 'faq',
          question: faq.question,
          answer: faq.answer,
          confidence: 0.8,
          category: faq.category_name
        }));
      }

      return [];
    } catch (error) {
      console.error('❌ FAQ 搜尋失敗:', error);
      return [];
    }
  }

  /**
   * 生成帶知識庫建議的回覆
   */
  async generateResponseWithFAQ(userMessage, conversationHistory = [], sessionContext = {}) {
    try {
      // 搜尋相關知識庫和 FAQ
      const contentSuggestions = await this.searchRelevantContent(userMessage);

      // 如果找到相關內容，將其加入系統提示
      let enhancedSystemPrompt = this.systemPrompt;
      
      if (contentSuggestions.length > 0) {
        enhancedSystemPrompt += '\\n\\n相關知識庫和 FAQ 參考：\\n';
        contentSuggestions.forEach((content, index) => {
          const typeLabel = content.type === 'knowledge_base' ? '知識庫' : 'FAQ';
          enhancedSystemPrompt += `${index + 1}. [${typeLabel}] Q: ${content.question}\\n   A: ${content.answer}\\n`;
          if (content.category) {
            enhancedSystemPrompt += `   分類: ${content.category}\\n`;
          }
        });
        enhancedSystemPrompt += '\\n請參考以上內容提供更精確的回答。如果用戶的問題與以上內容相關，請優先使用這些資訊。';
      }

      // 暫時更新系統提示
      const originalPrompt = this.systemPrompt;
      this.systemPrompt = enhancedSystemPrompt;

      // 生成回覆
      const result = await this.generateResponse(userMessage, conversationHistory, sessionContext);

      // 還原系統提示
      this.systemPrompt = originalPrompt;

      // 添加知識庫建議到結果
      if (contentSuggestions.length > 0) {
        result.knowledgeBaseSuggestions = contentSuggestions;
        // 保持向下相容，也添加 faqSuggestions
        result.faqSuggestions = contentSuggestions.filter(c => c.type === 'faq');
      }

      return result;

    } catch (error) {
      console.error('❌ 帶知識庫的回覆生成失敗:', error);
      // 降級到基本回覆
      return await this.generateResponse(userMessage, conversationHistory, sessionContext);
    }
  }

  /**
   * 分析用戶意圖
   */
  async analyzeIntent(userMessage) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
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
        max_tokens: 200,
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content);
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
}

// 創建單例實例
export const openaiService = new OpenAIService();