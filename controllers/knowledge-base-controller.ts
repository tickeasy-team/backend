/**
 * 知識庫 Controller
 * 提供知識庫管理和語義搜尋的 API 端點
 */

import { Request, Response } from 'express';
import { knowledgeBaseService } from '../services/knowledge-base-service.js';
import { semanticSearchService } from '../services/semantic-search-service.js';
import { embeddingService } from '../services/embedding-service.js';

export class KnowledgeBaseController {

  /**
   * 創建知識庫項目
   * POST /api/v1/knowledge-base
   */
  static async createKnowledgeBase(req: Request, res: Response) {
    try {
      const { title, content, category, tags, isActive } = req.body;

      const knowledgeBase = await knowledgeBaseService.createKnowledgeBase({
        title,
        content,
        category,
        tags,
        isActive
      });

      res.status(201).json({
        success: true,
        message: '知識庫項目創建成功',
        data: knowledgeBase
      });
    } catch (error) {
      console.error('❌ 創建知識庫項目失敗:', error);
      res.status(500).json({
        success: false,
        message: '創建知識庫項目失敗',
        error: error.message
      });
    }
  }

  /**
   * 更新知識庫項目
   * PUT /api/v1/knowledge-base/:id
   */
  static async updateKnowledgeBase(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, content, category, tags, isActive } = req.body;

      const knowledgeBase = await knowledgeBaseService.updateKnowledgeBase(id, {
        title,
        content,
        category,
        tags,
        isActive
      });

      res.json({
        success: true,
        message: '知識庫項目更新成功',
        data: knowledgeBase
      });
    } catch (error) {
      console.error('❌ 更新知識庫項目失敗:', error);
      
      if (error.message.includes('不存在')) {
        res.status(404).json({
          success: false,
          message: '知識庫項目不存在'
        });
      } else {
        res.status(500).json({
          success: false,
          message: '更新知識庫項目失敗',
          error: error.message
        });
      }
    }
  }

  /**
   * 刪除知識庫項目
   * DELETE /api/v1/knowledge-base/:id
   */
  static async deleteKnowledgeBase(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await knowledgeBaseService.deleteKnowledgeBase(id);

      res.json({
        success: true,
        message: '知識庫項目刪除成功'
      });
    } catch (error) {
      console.error('❌ 刪除知識庫項目失敗:', error);
      
      if (error.message.includes('不存在')) {
        res.status(404).json({
          success: false,
          message: '知識庫項目不存在'
        });
      } else {
        res.status(500).json({
          success: false,
          message: '刪除知識庫項目失敗',
          error: error.message
        });
      }
    }
  }

  /**
   * 獲取知識庫項目詳情
   * GET /api/v1/knowledge-base/:id
   */
  static async getKnowledgeBase(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const knowledgeBase = await knowledgeBaseService.getKnowledgeBase(id);

      if (!knowledgeBase) {
        return res.status(404).json({
          success: false,
          message: '知識庫項目不存在'
        });
      }

      res.json({
        success: true,
        data: knowledgeBase
      });
    } catch (error) {
      console.error('❌ 獲取知識庫項目失敗:', error);
      res.status(500).json({
        success: false,
        message: '獲取知識庫項目失敗',
        error: error.message
      });
    }
  }

  /**
   * 獲取知識庫列表
   * GET /api/v1/knowledge-base
   */
  static async getKnowledgeBaseList(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        search,
        includeInactive = false
      } = req.query;

      const result = await knowledgeBaseService.getKnowledgeBaseList({
        page: Number(page),
        limit: Number(limit),
        category: category as string,
        search: search as string,
        includeInactive: includeInactive === 'true'
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ 獲取知識庫列表失敗:', error);
      res.status(500).json({
        success: false,
        message: '獲取知識庫列表失敗',
        error: error.message
      });
    }
  }

  /**
   * 語義搜尋知識庫
   * GET /api/v1/knowledge-base/search
   */
  static async searchKnowledgeBase(req: Request, res: Response) {
    try {
      const {
        q: query,
        limit = 10,
        threshold = 0.7,
        categories
      } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          message: '搜尋查詢參數不能為空'
        });
      }

      const categoryArray = categories 
        ? (typeof categories === 'string' ? [categories] : categories as string[])
        : undefined;

      const results = await knowledgeBaseService.searchKnowledgeBase(query, {
        limit: Number(limit),
        threshold: Number(threshold),
        categories: categoryArray
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
        message: '搜尋知識庫失敗',
        error: error.message
      });
    }
  }

  /**
   * 尋找相似內容
   * GET /api/v1/knowledge-base/:id/similar
   */
  static async findSimilarContent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { limit = 5 } = req.query;

      const similarContent = await semanticSearchService.findSimilarContent(
        id,
        'knowledge_base',
        Number(limit)
      );

      res.json({
        success: true,
        data: {
          similar: similarContent
        }
      });
    } catch (error) {
      console.error('❌ 尋找相似內容失敗:', error);
      res.status(500).json({
        success: false,
        message: '尋找相似內容失敗',
        error: error.message
      });
    }
  }

  /**
   * 獲取查詢建議
   * GET /api/v1/knowledge-base/suggestions
   */
  static async getQuerySuggestions(req: Request, res: Response) {
    try {
      const { q: partialQuery, limit = 5 } = req.query;

      if (!partialQuery || typeof partialQuery !== 'string') {
        return res.status(400).json({
          success: false,
          message: '查詢參數不能為空'
        });
      }

      const suggestions = await semanticSearchService.getQuerySuggestions(
        partialQuery,
        Number(limit)
      );

      res.json({
        success: true,
        data: {
          suggestions
        }
      });
    } catch (error) {
      console.error('❌ 獲取查詢建議失敗:', error);
      res.status(500).json({
        success: false,
        message: '獲取查詢建議失敗',
        error: error.message
      });
    }
  }

  /**
   * 批量更新嵌入向量
   * POST /api/v1/knowledge-base/embeddings/update
   */
  static async updateEmbeddings(req: Request, res: Response) {
    try {
      console.log('🔄 開始批量更新嵌入向量...');
      const result = await knowledgeBaseService.batchUpdateEmbeddings();

      res.json({
        success: true,
        message: result.message,
        data: {
          updated: result.updated,
          failed: result.failed
        }
      });
    } catch (error) {
      console.error('❌ 批量更新嵌入向量失敗:', error);
      res.status(500).json({
        success: false,
        message: '批量更新嵌入向量失敗',
        error: error.message
      });
    }
  }

  /**
   * 獲取知識庫統計
   * GET /api/v1/knowledge-base/stats
   */
  static async getKnowledgeBaseStats(req: Request, res: Response) {
    try {
      const stats = await knowledgeBaseService.getKnowledgeBaseStats();
      const embeddingStats = await embeddingService.getEmbeddingStats();
      const searchStats = await semanticSearchService.getSearchStats();

      res.json({
        success: true,
        data: {
          knowledgeBase: stats,
          embeddings: embeddingStats,
          search: searchStats
        }
      });
    } catch (error) {
      console.error('❌ 獲取知識庫統計失敗:', error);
      res.status(500).json({
        success: false,
        message: '獲取知識庫統計失敗',
        error: error.message
      });
    }
  }

  /**
   * 測試語義搜尋功能
   * POST /api/v1/knowledge-base/test-search
   */
  static async testSemanticSearch(req: Request, res: Response) {
    try {
      const { query1, query2 } = req.body;

      if (!query1 || !query2) {
        return res.status(400).json({
          success: false,
          message: '請提供兩個查詢文本進行相似度測試'
        });
      }

      // 生成兩個查詢的嵌入向量
      const [embedding1, embedding2] = await Promise.all([
        embeddingService.generateEmbedding(query1),
        embeddingService.generateEmbedding(query2)
      ]);

      // 計算相似度
      const similarity = embeddingService.calculateCosineSimilarity(embedding1, embedding2);

      // 測試搜尋功能
      const searchResults = await semanticSearchService.searchKnowledgeBase(query1, {
        limit: 3,
        threshold: 0.5
      });

      res.json({
        success: true,
        data: {
          query1,
          query2,
          similarity,
          interpretation: similarity > 0.8 ? '非常相似' : 
                         similarity > 0.6 ? '相似' : 
                         similarity > 0.4 ? '部分相似' : '不太相似',
          searchResults
        }
      });
    } catch (error) {
      console.error('❌ 測試語義搜尋失敗:', error);
      res.status(500).json({
        success: false,
        message: '測試語義搜尋失敗',
        error: error.message
      });
    }
  }

  /**
   * 檢查嵌入服務狀態
   * GET /api/v1/knowledge-base/embedding-status
   */
  static async checkEmbeddingStatus(req: Request, res: Response) {
    try {
      const isAvailable = await embeddingService.isServiceAvailable();
      const stats = await embeddingService.getEmbeddingStats();

      res.json({
        success: true,
        data: {
          serviceAvailable: isAvailable,
          stats,
          model: 'text-embedding-3-small',
          dimensions: 1536
        }
      });
    } catch (error) {
      console.error('❌ 檢查嵌入服務狀態失敗:', error);
      res.status(500).json({
        success: false,
        message: '檢查嵌入服務狀態失敗',
        error: error.message
      });
    }
  }
}