import OpenAI from 'openai';
import { Concert } from '../models/concert.js';
import reviewRulesService, { ReviewCriteria } from './reviewRulesService.js';

// AI 審核回應的標準格式
export interface AIReviewResponse {
  approved: boolean;
  confidence: number;
  reasons: string[];
  suggestions?: string[];
  flaggedContent?: string[];
  summary: string;
  requiresManualReview: boolean;
  rawResponse?: any;
  error?: string;
}

const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_MAX_TOKENS = 2000;
const OPENAI_TEMPERATURE = 0.2;

export class OpenAIService {
  private openai: OpenAI;
  private isInitialized: boolean = false;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OPENAI_API_KEY 環境變數未設定，OpenAIService 將無法正常運作。AI 審核功能將停用。');
      this.isInitialized = false;
      this.openai = new OpenAI({ apiKey: 'DUMMY_KEY_DO_NOT_USE_OR_THROW_ERROR' });
      console.log('[OpenAIService Constructor] OpenAI API Key 未設定。服務未初始化。');
    } else {
      try {
        this.openai = new OpenAI({ apiKey });
        this.isInitialized = true;
        console.log('[OpenAIService Constructor] OpenAI Service 初始化成功。');
      } catch (initError: any) {
        console.error('[OpenAIService Constructor] 初始化 OpenAI client 失敗:', initError);
        this.isInitialized = false;
        this.openai = new OpenAI({ apiKey: undefined });
      }
    }
  }

  get isServiceAvailable(): boolean {
    return this.isInitialized;
  }

  // 最簡單的 System Prompt
  private getSystemPrompt(): string {
    return `請嚴格按照以下 JSON 格式提供您的審核結果，不要包含任何額外文字或解釋。
所有欄位都必須存在。
{
  "approved": boolean, // 審核是否通過
  "confidence": number, // 信心指數 (0.0 至 1.0)
  "reasons": string[], // 審核決策的主要原因列表
  "suggestions": string[], // (可選) 針對未通過項的修改建議
  "flaggedContent": string[], // (可選) 標記出的具體不當內容片段
  "summary": "string", // 對整個審核結果的簡短總結，必須提供，即使是很簡短的說明
  "requiresManualReview": boolean // 是否建議人工複審
}`;
  }

  /**
   * 通用聊天完成 API
   * @param messages 聊天訊息陣列
   * @param options 額外選項，如 model, temperature
   * @returns AI 模型的回應字串
   */
  async getChatCompletion(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    options: { model?: string; temperature?: number } = {}
  ): Promise<string> {
    if (!this.isInitialized) {
      console.warn('OpenAI Service 未初始化，無法取得聊天回覆。');
      return 'AI服務目前無法使用，請稍後再試。';
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: options.model || OPENAI_MODEL,
        messages,
        temperature: options.temperature === undefined ? OPENAI_TEMPERATURE : options.temperature,
        max_tokens: OPENAI_MAX_TOKENS,
      });

      return response.choices[0].message.content || '';
    } catch (error: any) {
      console.error('❌ 與 OpenAI API 互動失敗:', error);
      throw new Error(`OpenAI API 錯誤: ${error.message}`);
    }
  }

  // 建立 User Prompt
  private buildReviewPrompt(concert: Concert, criteria: ReviewCriteria): string {
    // 輔助函數，用於安全地格式化日期
    const formatDate = (dateValue: any): string => {
      if (!dateValue) return '未提供';
      let dateObj: Date | null = null;
      if (dateValue instanceof Date) {
        dateObj = dateValue;
      } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        const parsedDate = new Date(dateValue);
        if (!isNaN(parsedDate.getTime())) {
          dateObj = parsedDate;
        }
      }
      return dateObj ? dateObj.toISOString().split('T')[0] : '未提供';
    };

    let prompt = '請根據您作為專業演唱會內容審核員的身份，並嚴格遵守系統提示詞中定義的 JSON 回應格式，審核以下演唱會活動的詳細資訊：\n\n';
    prompt += '== 演唱會基本資訊 ==\n';
    prompt += `標題: ${concert.conTitle || '未提供'}\n`;
    prompt += `簡介: ${concert.conIntroduction || '未提供'}\n`;
    prompt += `地點描述: ${concert.conLocation || '未提供'}\n`;
    prompt += `詳細地址: ${concert.conAddress || '未提供'}\n`;
    prompt += `活動開始日期: ${formatDate(concert.eventStartDate)}\n`;
    prompt += `活動結束日期: ${formatDate(concert.eventEndDate)}\n`;
    prompt += `橫幅圖片 URL: ${concert.imgBanner || '未提供'}\n`;
    prompt += `購票方式說明: ${concert.ticketPurchaseMethod || '未提供'}\n`;
    prompt += `注意事項: ${concert.precautions || '未提供'}\n`;
    prompt += `退票政策: ${concert.refundPolicy || '未提供'}\n\n`;

    // 場次和票種資訊
    if (concert.sessions && concert.sessions.length > 0) {
      prompt += '== 場次與票種資訊 ==\n';
      concert.sessions.forEach((session, sIndex) => {
        prompt += `場次 ${sIndex + 1}:\n`;
        prompt += `  標題: ${session.sessionTitle || '未提供'}\n`;
        prompt += `  日期: ${formatDate(session.sessionDate)}\n`;
        prompt += `  開始時間: ${session.sessionStart || '未提供'}\n`;
        prompt += `  結束時間: ${session.sessionEnd || '未提供'}\n`;
        prompt += `  座位圖 URL: ${session.imgSeattable || '未提供'}\n`;
        if (session.ticketTypes && session.ticketTypes.length > 0) {
          session.ticketTypes.forEach((ticket, tIndex) => {
            prompt += `  票種 ${tIndex + 1}:\n`;
            prompt += `    名稱: ${ticket.ticketTypeName || '未提供'}\n`;
            prompt += `    價格: ${ticket.ticketTypePrice === null || ticket.ticketTypePrice === undefined ? '未提供' : ticket.ticketTypePrice + ' TWD'}\n`;
            prompt += `    總量: ${ticket.totalQuantity === null || ticket.totalQuantity === undefined ? '未提供' : ticket.totalQuantity}\n`;
            prompt += `    入場方式: ${ticket.entranceType || '未提供'}\n`;
            prompt += `    福利: ${ticket.ticketBenefits || '未提供'}\n`;
            prompt += `    退票政策: ${ticket.ticketRefundPolicy || '未提供'}\n`;
          });
        }
        prompt += '\n';
      });
    } else {
      prompt += '此演唱會目前未設定任何場次資訊。\n\n';
    }

    // 新增日期邏輯分析段落
    const now = new Date();
    const eventStart = concert.eventStartDate ? new Date(concert.eventStartDate) : null;
    const eventEnd = concert.eventEndDate ? new Date(concert.eventEndDate) : null;

    prompt += '== 日期邏輯分析 ==\n';
    prompt += `當前時間: ${now.toISOString()}\n`;
    
    if (eventStart && eventEnd) {
      const eventDuration = Math.ceil((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24));
      const isEventInFuture = eventStart > now;
      prompt += `活動期間: ${formatDate(concert.eventStartDate)} 至 ${formatDate(concert.eventEndDate)}\n`;
      prompt += `活動天數: ${eventDuration} 天\n`;
      prompt += `活動是否為未來: ${isEventInFuture ? '是' : '否'}\n`;
    } else {
      prompt += '活動期間: 未完整設定\n';
    }

    // 分析每個場次的時間邏輯
    if (concert.sessions && concert.sessions.length > 0) {
      prompt += '\n各場次時間分析:\n';
      concert.sessions.forEach((session, index) => {
        const sessionDate = session.sessionDate ? new Date(session.sessionDate) : null;
        
        if (sessionDate) {
          const isInEventPeriod = eventStart && eventEnd ? 
            (sessionDate >= eventStart && sessionDate <= eventEnd) : false;
          const isFuture = sessionDate > now;
          const hoursFromNow = Math.round((sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60));
          
          prompt += `場次 ${index + 1} (${session.sessionTitle || '未命名'}):\n`;
          prompt += `  - 演出日期: ${formatDate(session.sessionDate)}\n`;
          prompt += `  - 是否在活動期間內: ${isInEventPeriod ? '是' : '否'}\n`;
          prompt += `  - 是否為未來時間: ${isFuture ? '是' : '否'}\n`;
          prompt += `  - 距離現在: ${hoursFromNow} 小時\n`;
          
          // 計算演出持續時間
          if (session.sessionStart && session.sessionEnd) {
            const startTime = new Date(`1970-01-01T${session.sessionStart}`);
            const endTime = new Date(`1970-01-01T${session.sessionEnd}`);
            let duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
            
            // 處理跨日情況
            if (duration < 0) {
              duration += 24;
            }
            
            prompt += `  - 演出時長: ${duration.toFixed(1)} 小時\n`;
            prompt += `  - 時段: ${session.sessionStart} - ${session.sessionEnd}\n`;
          }
          
          // 售票時間分析
          if (session.ticketTypes && session.ticketTypes.length > 0) {
            session.ticketTypes.forEach((ticket, ticketIndex) => {
              if (ticket.sellBeginDate && ticket.sellEndDate) {
                const sellStart = new Date(ticket.sellBeginDate);
                const sellEnd = new Date(ticket.sellEndDate);
                const sellDuration = Math.ceil((sellEnd.getTime() - sellStart.getTime()) / (1000 * 60 * 60 * 24));
                const sellEndBeforeEvent = sellEnd <= sessionDate;
                const sellStartInPast = sellStart <= now;
                
                prompt += `  票種 ${ticketIndex + 1} (${ticket.ticketTypeName || '未命名'}) 售票分析:\n`;
                prompt += `    - 售票期間: ${sellDuration} 天\n`;
                prompt += `    - 售票開始: ${formatDate(ticket.sellBeginDate)} ${sellStartInPast ? '(已開始)' : '(未開始)'}\n`;
                prompt += `    - 售票結束: ${formatDate(ticket.sellEndDate)}\n`;
                prompt += `    - 售票結束是否早於演出: ${sellEndBeforeEvent ? '是' : '否'}\n`;
              }
            });
          }
        } else {
          prompt += `場次 ${index + 1}: 演出日期未設定\n`;
        }
        prompt += '\n';
      });
    }
    
    prompt += '\n';

    // 審核標準提示
    prompt += '== 審核標準與重點 ==\n';
    if (criteria.checkInformationCompleteness) {
      prompt += '- 資訊完整性：檢查上述所有欄位是否都已提供且內容清晰、無矛盾之處。\n';
    }
    if (criteria.checkInappropriateContent) {
      const sensitiveWords = reviewRulesService.getSensitiveWords();
      prompt += `- 不當內容：檢查所有文字描述是否包含敏感詞（例如：${sensitiveWords.slice(0, 5).join('、')}...等）。\n`;
    }
    if (criteria.checkFalseAdvertising) {
      prompt += '- 虛假宣傳：檢查活動描述是否存在誇大不實、誤導消費者或無法兌現的承諾。\n';
    }
    if (criteria.checkPricingReasonableness) {
      const pricingConfig = reviewRulesService.getPricingConfig();
      prompt += `- 價格合理性：檢查各票種價格是否在市場普遍接受的範圍內（${pricingConfig.minPrice} - ${pricingConfig.maxPrice} TWD）。\n`;
    }
    
    // 新增日期相關審核標準
    if (criteria.checkDateLogic) {
      prompt += '- 日期邏輯檢查：\n';
      prompt += '  * 活動結束日期必須晚於或等於開始日期\n';
      prompt += '  * 所有演出日期必須在活動期間內\n';
      prompt += '  * 場次結束時間必須晚於開始時間\n';
      prompt += '  * 演出持續時間要合理（建議30分鐘-8小時）\n';
    }
    
    if (criteria.checkFutureEvents) {
      prompt += '- 未來活動檢查：\n';
      prompt += '  * 所有演出日期必須是未來時間（至少距離現在24小時）\n';
      prompt += '  * 活動不能是已過期的歷史活動\n';
    }
    
    if (criteria.checkTicketSaleLogic) {
      prompt += '- 售票時間邏輯：\n';
      prompt += '  * 售票結束時間必須晚於售票開始時間\n';
      prompt += '  * 售票結束時間不能晚於演出時間\n';
      prompt += '  * 售票期間至少要有合理長度（建議3天以上）\n';
      prompt += '  * 售票開始時間不能是過去時間\n';
    }
    
    if (criteria.checkSessionSchedule) {
      prompt += '- 場次時間安排：\n';
      prompt += '  * 同一天多場次之間要有合理間隔（建議至少2小時）\n';
      prompt += '  * 演出時間要在合理時段內（建議8:00-23:00）\n';
      prompt += '  * 場次時間不能重疊或過於接近\n';
    }
    
    prompt += '\n請提供您的審核結果。確保您的回應完全符合系統提示中定義的 JSON 結構，特別是 "summary" 欄位必須包含對審核的簡要總結。';
    return prompt;
  }

  // 呼叫 OpenAI API 進行審核
  async reviewConcert(
    concert: Concert,
    criteria?: ReviewCriteria
  ): Promise<AIReviewResponse> {
    console.log(`[OpenAIService reviewConcert] 開始審核演唱會 ID: ${concert.concertId}`);
    if (!this.isServiceAvailable) {
      console.error(`[OpenAIService reviewConcert] OpenAI 服務未初始化或 API Key 無效。演唱會 ID: ${concert.concertId}`);
      return this.getFallbackResponse('OpenAI 服務未初始化，API Key 未設定或無效。');
    }

    const reviewCriteria = criteria || reviewRulesService.getReviewCriteria();
    console.log('[OpenAIService reviewConcert] 使用的審核標準:', reviewCriteria);

    try {
      const prompt = this.buildReviewPrompt(concert, reviewCriteria);
      console.log(`[OpenAIService reviewConcert] 建立的 Prompt (前 100 字元): ${prompt.substring(0,100)}...`);

      console.log(`[OpenAIService reviewConcert] 準備呼叫 OpenAI API。模型: ${OPENAI_MODEL}, 溫度: ${OPENAI_TEMPERATURE}, Max Tokens: ${OPENAI_MAX_TOKENS}`);
      const completion = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        temperature: OPENAI_TEMPERATURE,
        max_tokens: OPENAI_MAX_TOKENS,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        console.error(`[OpenAIService reviewConcert] OpenAI API 回應內容為空。演唱會 ID: ${concert.concertId}, API 回應:`, completion);
        return this.getFallbackResponse('OpenAI API 回應內容為空');
      }
      console.log(`[OpenAIService reviewConcert] 收到 OpenAI API 回應。演唱會 ID: ${concert.concertId}`);

      try {
        const aiResult = JSON.parse(responseContent) as Partial<AIReviewResponse>;
        console.log(`[OpenAIService reviewConcert] 成功解析 OpenAI JSON 回應。演唱會 ID: ${concert.concertId}`, aiResult);
        return {
          approved: aiResult.approved ?? false,
          confidence: aiResult.confidence ?? 0,
          reasons: aiResult.reasons || [],
          suggestions: aiResult.suggestions || [],
          flaggedContent: aiResult.flaggedContent || [],
          summary: aiResult.summary || 'AI 未提供總結',
          requiresManualReview: aiResult.requiresManualReview ?? true,
          rawResponse: aiResult,
        };
      } catch (parseError: any) {
        console.error(`[OpenAIService reviewConcert] 解析 OpenAI JSON 回應失敗。演唱會 ID: ${concert.concertId}, 錯誤:`, parseError, `回應內容: ${responseContent}`);
        return this.getFallbackResponse('解析 OpenAI JSON 回應失敗', { errorDetails: parseError.message, responseContent });
      }
    } catch (error: any) {
      let errorMessage = 'AI 審核服務發生未知錯誤';
      if (error instanceof OpenAI.APIError) {
        console.error(`[OpenAIService reviewConcert] OpenAI API 錯誤。演唱會 ID: ${concert.concertId}, Status: ${error.status}, Type: ${error.type}, Message: ${error.message}`, error);
        errorMessage = `OpenAI API 錯誤 (Status: ${error.status}, Type: ${error.type}): ${error.message}`;
      } else if (error.message) {
        console.error(`[OpenAIService reviewConcert] AI 審核服務發生非 API 錯誤。演唱會 ID: ${concert.concertId}, 錯誤訊息: ${error.message}`, error);
        errorMessage = error.message;
      } else {
        console.error(`[OpenAIService reviewConcert] AI 審核服務發生未知錯誤且無錯誤訊息。演唱會 ID: ${concert.concertId}`, error);
      }
      return this.getFallbackResponse(errorMessage, error);
    }
  }

  // 降級回應
  private getFallbackResponse(errorMessage: string, rawError?: any): AIReviewResponse {
    console.warn(`[OpenAIService getFallbackResponse] 觸發降級回應: ${errorMessage}`, rawError);
    return {
      approved: false,
      confidence: 0,
      reasons: [errorMessage],
      summary: 'AI 審核無法完成，建議人工檢查。',
      requiresManualReview: true,
      rawResponse: rawError || { error: errorMessage },
      error: errorMessage,
    };
  }

  // 測試 OpenAI API 連線
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    console.log('[OpenAIService testConnection] 開始測試 OpenAI API 連線...');
    if (!this.isServiceAvailable) {
      console.error('[OpenAIService testConnection] OpenAI Service 未初始化 (API Key 問題)，測試無法執行。');
      return { success: false, message: 'OpenAI Service 未初始化 (API Key 問題)' };
    }
    try {
      const completion = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: '請僅回覆 "測試成功" 四個字，不要包含其他任何標點或文字。' }],
        max_tokens: 10,
        temperature: 0,
      });
      const responseText = completion.choices[0]?.message?.content;
      if (responseText === '測試成功') {
        console.log('[OpenAIService testConnection] OpenAI API 連接測試成功！');
        return { success: true, message: 'OpenAI API 連接測試成功！' };
      }
      console.warn(`[OpenAIService testConnection] OpenAI API 測試未達預期回應: ${responseText}`, completion);
      return { success: false, message: `OpenAI API 測試未達預期回應: ${responseText}`, data: completion };
    } catch (error: any) {
      console.error(`[OpenAIService testConnection] OpenAI API 連接測試失敗: ${error.message}`, error);
      return { success: false, message: `OpenAI API 連接測試失敗: ${error.message}`, data: error };
    }
  }
}

export default new OpenAIService();