/**
 * 智能回覆控制器
 * 實現分層回覆策略的 API 端點
 */

import { Request, Response } from 'express';
import { smartReplyService } from '../services/smart-reply-service.js';
import { chatService } from '../services/chat-service.js';

export class SmartReplyController {
  /**
   * 智能回覆 - 主要入口
   */
  static async reply(req: Request, res: Response) {
    try {
      const { message, enableAI = false } = req.body;
      
      if (!message) {
        return res.status(400).json({
          success: false,
          message: '缺少必要參數：message'
        });
      }

      console.log(`🤖 智能回覆請求: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`);

      // 使用智能回覆服務
      const smartReply = await smartReplyService.getSmartReply(message, {
        enableFallbackToAI: enableAI
      });

      // 如果沒有找到匹配且啟用了 AI 後備
      if (smartReply.type === 'neutral' && enableAI) {
        try {
          const aiReply = await chatService.chat(message, {
            createSession: false
          });

          // 將 AI 回覆包裝成智能回覆格式
          return res.json({
            success: true,
            data: {
              type: 'ai_fallback',
              message: aiReply.message,
              data: {
                confidence: aiReply.confidence,
                sources: aiReply.sources
              },
              metadata: {
                processingTime: aiReply.processingTime,
                strategy: 'ai_fallback',
                model: aiReply.model
              }
            }
          });
        } catch (error) {
          console.warn('⚠️ AI 後備回覆失敗，使用中性回覆:', error);
        }
      }

      res.json({
        success: true,
        data: smartReply
      });

    } catch (error) {
      console.error('❌ 智能回覆失敗:', error);
      res.status(500).json({
        success: false,
        message: '智能回覆服務暫時無法使用，請稍後再試'
      });
    }
  }

  /**
   * 獲取所有教學規則
   */
  static async getTutorialRules(req: Request, res: Response) {
    try {
      const stats = smartReplyService.getRulesStats();
      
      res.json({
        success: true,
        data: {
          message: '教學規則列表',
          stats,
          tutorials: [
            {
              keywords: ['購票', '買票', '下單', '訂票'],
              title: '完整購票教學',
              url: '/help/tutorial/how-to-buy-tickets'
            },
            {
              keywords: ['退票', '取消訂單', '申請退款'],
              title: '退票流程教學',
              url: '/help/tutorial/how-to-refund'
            },
            {
              keywords: ['改票', '更改座位', '換票'],
              title: '改票說明',
              url: '/help/tutorial/how-to-change-ticket'
            },
            {
              keywords: ['電子票', 'QR code', '入場'],
              title: '電子票券使用教學',
              url: '/help/tutorial/how-to-use-eticket'
            }
          ]
        }
      });

    } catch (error) {
      console.error('❌ 獲取教學規則失敗:', error);
      res.status(500).json({
        success: false,
        message: '無法獲取教學規則'
      });
    }
  }

  /**
   * 測試關鍵字匹配
   */
  static async testKeywords(req: Request, res: Response) {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({
          success: false,
          message: '缺少測試訊息'
        });
      }

      const result = await smartReplyService.getSmartReply(message);

      res.json({
        success: true,
        data: {
          input: message,
          result: {
            type: result.type,
            strategy: result.metadata.strategy,
            matchedKeywords: result.metadata.matchedKeywords,
            confidence: result.data?.confidence,
            processingTime: result.metadata.processingTime
          },
          response: result.message
        }
      });

    } catch (error) {
      console.error('❌ 測試關鍵字匹配失敗:', error);
      res.status(500).json({
        success: false,
        message: '測試失敗'
      });
    }
  }

  /**
   * 添加新的教學規則 (管理功能)
   */
  static async addTutorialRule(req: Request, res: Response) {
    try {
      const { keywords, title, url, priority = 3, description } = req.body;
      
      if (!keywords || !title || !url) {
        return res.status(400).json({
          success: false,
          message: '缺少必要參數：keywords, title, url'
        });
      }

      smartReplyService.addTutorialRule({
        keywords: Array.isArray(keywords) ? keywords : [keywords],
        title,
        url,
        priority,
        description
      });

      res.json({
        success: true,
        message: '教學規則添加成功',
        data: {
          keywords,
          title,
          url,
          priority
        }
      });

    } catch (error) {
      console.error('❌ 添加教學規則失敗:', error);
      res.status(500).json({
        success: false,
        message: '添加規則失敗'
      });
    }
  }

  /**
   * 添加新的 FAQ 規則 (管理功能)
   */
  static async addFAQRule(req: Request, res: Response) {
    try {
      const { keywords, answer, faqId, priority = 3, relatedQuestions } = req.body;
      
      if (!keywords || !answer) {
        return res.status(400).json({
          success: false,
          message: '缺少必要參數：keywords, answer'
        });
      }

      smartReplyService.addFAQRule({
        keywords: Array.isArray(keywords) ? keywords : [keywords],
        answer,
        faqId,
        priority,
        relatedQuestions
      });

      res.json({
        success: true,
        message: 'FAQ 規則添加成功',
        data: {
          keywords,
          answer,
          faqId,
          priority
        }
      });

    } catch (error) {
      console.error('❌ 添加 FAQ 規則失敗:', error);
      res.status(500).json({
        success: false,
        message: '添加規則失敗'
      });
    }
  }

  /**
   * 系統狀態檢查
   */
  static async healthCheck(req: Request, res: Response) {
    try {
      const stats = smartReplyService.getRulesStats();

      res.json({
        success: true,
        message: '智能回覆系統運行正常',
        data: {
          rulesLoaded: stats,
          features: {
            tutorialMatching: true,
            faqMatching: true,
            knowledgeBaseSearch: true,
            neutralReply: true
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ 健康檢查失敗:', error);
      res.status(503).json({
        success: false,
        message: '智能回覆系統不可用'
      });
    }
  }
} 