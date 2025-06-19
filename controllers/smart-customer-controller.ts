/**
 * 智能客服控制器
 */

import { Request, Response } from 'express';
import { unifiedCustomerService, ChatMessage } from '../services/unified-customer-service.js';
import { supabaseService } from '../services/supabase-service.js';

export class SmartCustomerController {
  /**
   * 智能客服對話
   */
  static async chat(req: Request, res: Response) {
    try {
      const { message, history = [] } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          message: '請提供有效的對話訊息'
        });
      }

      if (message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: '訊息不能為空'
        });
      }

      if (message.length > 1000) {
        return res.status(400).json({
          success: false,
          message: '訊息長度不能超過 1000 字'
        });
      }

      // 驗證歷史對話格式
      let chatHistory: ChatMessage[] = [];
      if (Array.isArray(history)) {
        chatHistory = history.filter((msg: any) => 
          msg && 
          typeof msg.role === 'string' && 
          ['user', 'assistant'].includes(msg.role) &&
          typeof msg.content === 'string'
        ).slice(-10); // 最多保留最近 10 輪對話
      }

      console.log(`💬 收到用戶提問: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`);

      const result = await unifiedCustomerService.chat(message, {
        includeHistory: chatHistory,
        createSession: false // AI 客服不需要建立會話記錄
      });

      res.json({
        success: true,
        data: {
          response: result.message,
          sources: result.sources,
          confidence: result.confidence,
          hasRelevantInfo: result.hasRelevantInfo,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ 智能客服對話失敗:', error);
      res.status(500).json({
        success: false,
        message: '智能客服暫時無法回應，請稍後再試'
      });
    }
  }

  /**
   * 獲取常見問題
   */
  static async getCommonQuestions(req: Request, res: Response) {
    try {
      const questions = await unifiedCustomerService.getCommonQuestions();

      res.json({
        success: true,
        data: {
          questions,
          count: questions.length
        }
      });

    } catch (error) {
      console.error('❌ 獲取常見問題失敗:', error);
      res.status(500).json({
        success: false,
        message: '無法獲取常見問題'
      });
    }
  }

  /**
   * 搜尋知識庫
   */
  static async searchKnowledgeBase(req: Request, res: Response) {
    try {
      const { q: query, limit = 5, categories } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          message: '請提供搜尋查詢'
        });
      }

      const searchLimit = Math.min(parseInt(limit as string) || 5, 20);
      const searchCategories = categories ? 
        (typeof categories === 'string' ? [categories] : categories as string[]) : 
        undefined;

      const results = await supabaseService.searchKnowledgeBase(query, {
        limit: searchLimit,
        categories: searchCategories
      });

      res.json({
        success: true,
        data: {
          query,
          results,
          total: results.length
        }
      });

    } catch (error) {
      console.error('❌ 搜尋知識庫失敗:', error);
      res.status(500).json({
        success: false,
        message: '搜尋服務暫時無法使用'
      });
    }
  }

  /**
   * 獲取查詢建議
   */
  static async getQuerySuggestions(req: Request, res: Response) {
    try {
      const { q: query, limit = 5 } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          message: '請提供查詢字串'
        });
      }

      const suggestionLimit = Math.min(parseInt(limit as string) || 5, 10);
      const suggestions = await supabaseService.getQuerySuggestions(query, suggestionLimit);

      res.json({
        success: true,
        data: {
          query,
          suggestions,
          count: suggestions.length
        }
      });

    } catch (error) {
      console.error('❌ 獲取查詢建議失敗:', error);
      res.status(500).json({
        success: false,
        message: '無法獲取查詢建議'
      });
    }
  }

  /**
   * 獲取知識庫統計
   */
  static async getStats(req: Request, res: Response) {
    try {
      const stats = await supabaseService.getKnowledgeBaseStats();

      res.json({
        success: true,
        data: {
          knowledgeBase: stats,
          serviceStatus: {
            supabaseConnected: await supabaseService.testConnection(),
            openaiAvailable: await unifiedCustomerService.checkServiceStatus()
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ 獲取統計失敗:', error);
      res.status(500).json({
        success: false,
        message: '無法獲取統計資料'
      });
    }
  }

  /**
   * 系統健康檢查
   */
  static async healthCheck(req: Request, res: Response) {
    try {
      const [supabaseOk, openaiOk] = await Promise.all([
        supabaseService.testConnection(),
        unifiedCustomerService.checkServiceStatus()
      ]);

      const isHealthy = supabaseOk && openaiOk;

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        message: isHealthy ? '智能客服系統運行正常' : '部分服務不可用',
        data: {
          services: {
            supabase: supabaseOk ? 'healthy' : 'unhealthy',
            openai: openaiOk ? 'healthy' : 'unhealthy'
          },
          features: {
            chat: isHealthy,
            search: supabaseOk,
            ai: openaiOk
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ 健康檢查失敗:', error);
      res.status(503).json({
        success: false,
        message: '系統健康檢查失敗'
      });
    }
  }

  /**
   * 測試對話功能
   */
  static async testChat(req: Request, res: Response) {
    try {
      const testQueries = [
        '如何購買票？',
        '可以退票嗎？',
        '支援哪些付款方式？'
      ];

      const results = [];

      for (const query of testQueries) {
        try {
          const result = await unifiedCustomerService.chat(query, {
            createSession: false // 測試不需要建立會話記錄
          });
          results.push({
            query,
            success: true,
            confidence: result.confidence,
            hasRelevantInfo: result.hasRelevantInfo,
            sourcesCount: result.sources.length
          });
        } catch (error) {
          results.push({
            query,
            success: false,
            error: error instanceof Error ? error.message : '未知錯誤'
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const isHealthy = successCount >= testQueries.length * 0.7; // 70% 成功率

      res.json({
        success: isHealthy,
        message: `對話功能測試完成: ${successCount}/${testQueries.length} 通過`,
        data: {
          results,
          successRate: successCount / testQueries.length,
          isHealthy
        }
      });

    } catch (error) {
      console.error('❌ 測試對話功能失敗:', error);
      res.status(500).json({
        success: false,
        message: '測試功能失敗'
      });
    }
  }
}
