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
      this.openai = new OpenAI({ apiKey: 'DUMMY_KEY_DO_NOT_USE' });
    } else {
      this.openai = new OpenAI({ apiKey });
      this.isInitialized = true;
    }
  }

  get isServiceAvailable(): boolean {
    return this.isInitialized;
  }

  // 最簡單的 System Prompt
  private getSystemPrompt(): string {
    return `請以 JSON 格式回應，不要包含任何額外文字。`;
  }

  // 建立 User Prompt
  private buildReviewPrompt(concert: Concert, criteria: ReviewCriteria): string {
    let prompt = '請根據您作為專業演唱會內容審核員的身份，並嚴格遵守系統提示詞中定義的 JSON 回應格式，審核以下演唱會活動的詳細資訊：\n\n';
    prompt += '== 演唱會基本資訊 ==\n';
    prompt += `標題: ${concert.conTitle || '未提供'}\n`;
    prompt += `簡介: ${concert.conIntroduction || '未提供'}\n`;
    prompt += `地點描述: ${concert.conLocation || '未提供'}\n`;
    prompt += `詳細地址: ${concert.conAddress || '未提供'}\n`;
    prompt += `活動開始日期: ${concert.eventStartDate ? concert.eventStartDate.toISOString().split('T')[0] : '未提供'}\n`;
    prompt += `活動結束日期: ${concert.eventEndDate ? concert.eventEndDate.toISOString().split('T')[0] : '未提供'}\n`;
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
        prompt += `  日期: ${session.sessionDate ? new Date(session.sessionDate).toISOString().split('T')[0] : '未提供'}\n`;
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
    prompt += '\n請提供您的審核結果。';
    return prompt;
  }

  // 呼叫 OpenAI API 進行審核
  async reviewConcert(
    concert: Concert,
    criteria?: ReviewCriteria
  ): Promise<AIReviewResponse> {
    if (!this.isServiceAvailable) {
      return this.getFallbackResponse('OpenAI 服務未初始化，API Key 未設定或無效。');
    }

    const reviewCriteria = criteria || reviewRulesService.getReviewCriteria();

    try {
      const prompt = this.buildReviewPrompt(concert, reviewCriteria);

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
        return this.getFallbackResponse('OpenAI API 回應內容為空');
      }

      try {
        const aiResult = JSON.parse(responseContent) as Partial<AIReviewResponse>;
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
      } catch (parseError) {
        return this.getFallbackResponse('解析 OpenAI JSON 回應失敗', responseContent);
      }
    } catch (error: any) {
      let errorMessage = 'AI 審核服務發生未知錯誤';
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = `OpenAI API 錯誤: ${error.response.data.error.message}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      return this.getFallbackResponse(errorMessage, error);
    }
  }

  // 降級回應
  private getFallbackResponse(errorMessage: string, rawError?: any): AIReviewResponse {
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
    if (!this.isServiceAvailable) {
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
        return { success: true, message: 'OpenAI API 連接測試成功！' };
      }
      return { success: false, message: `OpenAI API 測試未達預期回應: ${responseText}`, data: completion };
    } catch (error: any) {
      return { success: false, message: `OpenAI API 連接測試失敗: ${error.message}`, data: error };
    }
  }
}

export default new OpenAIService();