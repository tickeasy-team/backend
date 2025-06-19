/**
 * 智能回覆路由
 * 實現分層回覆策略的路由端點
 */

import express from 'express';
import { SmartReplyController } from '../controllers/smart-reply-controller.js';

const router = express.Router();

/**
 * @route POST /api/smart-reply/reply
 * @desc 智能回覆主要端點
 * @body { message: string, enableAI?: boolean }
 */
router.post('/reply', SmartReplyController.reply);

/**
 * @route GET /api/smart-reply/tutorials
 * @desc 獲取所有教學規則
 */
router.get('/tutorials', SmartReplyController.getTutorialRules);

/**
 * @route POST /api/smart-reply/test
 * @desc 測試關鍵字匹配
 * @body { message: string }
 */
router.post('/test', SmartReplyController.testKeywords);

/**
 * @route POST /api/smart-reply/tutorial
 * @desc 添加新的教學規則 (管理功能)
 * @body { keywords: string[], title: string, url: string, priority?: number, description?: string }
 */
router.post('/tutorial', SmartReplyController.addTutorialRule);

/**
 * @route POST /api/smart-reply/faq
 * @desc 添加新的 FAQ 規則 (管理功能)
 * @body { keywords: string[], answer: string, faqId?: string, priority?: number, relatedQuestions?: string[] }
 */
router.post('/faq', SmartReplyController.addFAQRule);

/**
 * @route GET /api/smart-reply/health
 * @desc 系統健康檢查
 */
router.get('/health', SmartReplyController.healthCheck);

export default router; 